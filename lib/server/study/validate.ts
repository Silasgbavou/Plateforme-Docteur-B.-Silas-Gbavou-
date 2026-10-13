import { z } from "zod";

/** Normalisation pour comparer un extrait au texte source (espaces, casse, apostrophes, guillemets). */
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[’‘`´]/g, "'")
    .replace(/[«»“”„]/g, '"')
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    // Typographie française : espaces (souvent insécables) autour des guillemets et avant ; : ! ?
    .replace(/"\s+/g, '"')
    .replace(/\s+"/g, '"')
    .replace(/\s+([;:!?])/g, "$1")
    .trim()
    .toLowerCase();
}

const rawSchema = z.object({
  suffisance: z.enum(["suffisante", "partielle", "insuffisante"]).catch("partielle"),
  sections: z
    .object({
      fondement: z.string().catch(""),
      ecritures: z.string().catch(""),
      ancrage: z.string().catch(""),
      application: z.string().catch(""),
    })
    .catch({ fondement: "", ecritures: "", ancrage: "", application: "" }),
  citations: z.array(z.object({ source: z.string(), extrait: z.string() })).catch([]),
  relances: z.array(z.object({ question: z.string(), sources: z.array(z.string()).catch([]) })).catch([]),
  limites: z.string().catch(""),
});

export interface ValidatedCitation {
  source: string;
  extrait: string;
}

export interface ValidatedAnswer {
  suffisance: "suffisante" | "partielle" | "insuffisante";
  sections: { fondement: string; ecritures: string; ancrage: string; application: string };
  citations: ValidatedCitation[];
  relances: { question: string; sources: string[] }[];
  limites: string;
  rejected: { citations: number; references: number; versets: number; relances: number };
}

const MIN_WORDS = 6;

/** Référence biblique simple : « Jean 3:16 », « 1 Corinthiens 13.4-7 », « Ps 23 v 1 ». */
const VERSE_RE = /\b((?:[1-3]\s?)?[A-ZÉÈ][a-zéèêëîïôûüç]+\.?)\s+(\d{1,3})\s*[:.,]\s*(\d{1,3})(?:\s*[-–]\s*\d{1,3})?/g;

export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSON absent");
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * Valide la sortie du modèle contre les sources réellement fournies :
 * 1. chaque citation doit être un extrait contigu exact (normalisé) d'au moins 6 mots de SA source ;
 * 2. les références [Sx] inconnues sont retirées ;
 * 3. les références bibliques de la section Écritures absentes des sources sont retirées (phrase entière) ;
 * 4. les relances doivent s'appuyer sur des sources fournies ;
 * 5. sans aucune citation valide, la réponse est déclassée en « insuffisante ».
 */
export function validateAnswer(modelText: string, sources: Map<string, string>): ValidatedAnswer {
  const parsed = rawSchema.parse(extractJson(modelText));
  const rejected = { citations: 0, references: 0, versets: 0, relances: 0 };
  const normSources = new Map([...sources].map(([k, v]) => [k, normalizeForMatch(v)]));

  const citations: ValidatedCitation[] = [];
  const seen = new Set<string>();
  for (const c of parsed.citations) {
    const src = normSources.get(c.source);
    const ex = normalizeForMatch(c.extrait.replace(/^["'«\s]+|["'»\s]+$/g, ""));
    const words = ex.split(" ").filter(Boolean).length;
    if (!src || words < MIN_WORDS || !src.includes(ex)) {
      rejected.citations++;
      continue;
    }
    const key = `${c.source}|${ex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({ source: c.source, extrait: c.extrait.trim() });
  }

  const cleanRefs = (s: string) =>
    s.replace(/\[(S\d{1,2})\]/g, (m, id: string) => {
      if (sources.has(id)) return m;
      rejected.references++;
      return "";
    });

  const allSourceText = normalizeForMatch([...sources.values()].join(" \n "));
  const cleanVerses = (s: string) =>
    s.split("\n").map((line) => splitSentences(line)
      .filter((sentence) => {
        const refs = [...sentence.matchAll(VERSE_RE)];
        if (!refs.length) return true;
        const ok = refs.every((r) => allSourceText.includes(normalizeForMatch(`${r[2]}:${r[3]}`)) || allSourceText.includes(normalizeForMatch(`${r[2]}.${r[3]}`)) || allSourceText.includes(normalizeForMatch(`${r[2]},${r[3]}`)));
        if (!ok) rejected.versets++;
        return ok;
      })
      .join(" ")).join("\n").replace(/\n{3,}/g, "\n\n");

  const sections = {
    fondement: cleanVerses(cleanRefs(parsed.sections.fondement)).trim(),
    ecritures: cleanVerses(cleanRefs(parsed.sections.ecritures)).trim(),
    ancrage: cleanVerses(cleanRefs(parsed.sections.ancrage)).trim(),
    application: cleanVerses(cleanRefs(parsed.sections.application)).trim(),
  };

  const relances = parsed.relances
    .filter((r) => {
      const ok = r.question.trim().length > 8 && r.sources.length > 0 && r.sources.every((s) => sources.has(s));
      if (!ok) rejected.relances++;
      return ok;
    })
    .slice(0, 2);

  let suffisance = parsed.suffisance;
  let limites = parsed.limites.trim();
  if (citations.length === 0 && suffisance !== "insuffisante") {
    suffisance = "insuffisante";
    limites = [limites, "Aucun extrait des sources n'a pu être vérifié pour étayer cette réponse."].filter(Boolean).join(" ");
  }
  if (rejected.versets > 0) {
    limites = [limites, "Des références bibliques non présentes dans les sources ont été retirées."].filter(Boolean).join(" ");
  }
  return { suffisance, sections, citations, relances, limites, rejected };
}

function splitSentences(s: string): string[] {
  return s.split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean);
}
