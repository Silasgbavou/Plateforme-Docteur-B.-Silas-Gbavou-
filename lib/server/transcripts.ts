/**
 * Transcriptions vidéo : analyse SRT / VTT / texte brut et nettoyage fidèle.
 * - Les repères temporels proviennent UNIQUEMENT du fichier source ; un texte brut n'en a pas.
 * - Le texte brut est toujours conservé ; le nettoyage est rejeté s'il perd du contenu.
 */
export interface Cue {
  start: number | null;
  end: number | null;
  text: string;
}

const TIME = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;

function toSec(m: RegExpMatchArray): number {
  const h = Number(m[1] ?? 0), mi = Number(m[2]), s = Number(m[3]), ms = Number((m[4] ?? "0").padEnd(3, "0"));
  return h * 3600 + mi * 60 + s + ms / 1000;
}

export function detectFormat(input: string): "srt" | "vtt" | "texte_brut" {
  const head = input.trimStart().slice(0, 200);
  if (/^WEBVTT/.test(head)) return "vtt";
  if (/^\d+\s*\n\s*\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->/m.test(head)) return "srt";
  return "texte_brut";
}

export function parseTimed(input: string): Cue[] {
  const blocks = input.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    const idx = lines.findIndex((l) => l.includes("-->"));
    if (idx < 0) continue;
    const [a, b] = lines[idx]!.split("-->");
    const ma = a?.match(TIME), mb = b?.match(TIME);
    if (!ma || !mb) continue;
    const text = lines
      .slice(idx + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "") // balises VTT/SRT (<i>, <c>, horodatages internes)
      .replace(/\{\\[^}]+\}/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) cues.push({ start: toSec(ma), end: toSec(mb), text });
  }
  // Les sous-titres automatiques répètent souvent la ligne précédente : on fusionne les doublons exacts consécutifs.
  return cues.filter((c, i) => i === 0 || c.text !== cues[i - 1]!.text);
}

export function parsePlain(input: string): Cue[] {
  return input
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((text) => ({ start: null, end: null, text }));
}

export function parseTranscript(input: string): { format: "srt" | "vtt" | "texte_brut"; cues: Cue[] } {
  const format = detectFormat(input);
  return { format, cues: format === "texte_brut" ? parsePlain(input) : parseTimed(input) };
}

/** Regroupe les cues en segments d'environ 700 caractères, bornes temporelles issues des cues. */
export function groupSegments(cues: Cue[], target = 700): Cue[] {
  const out: Cue[] = [];
  let cur: Cue | null = null;
  for (const c of cues) {
    if (!cur) {
      cur = { ...c };
      continue;
    }
    if (cur.text.length + c.text.length + 1 <= target) {
      cur.text += ` ${c.text}`;
      cur.end = c.end ?? cur.end;
    } else {
      out.push(cur);
      cur = { ...c };
    }
  }
  if (cur) out.push(cur);
  return out;
}

const FILLERS = /\b(euh+|heu+|hum+|bah|ben)\b[,]?\s*/gi;

/**
 * Nettoyage minimal : tics de langage sans valeur sémantique et répétitions immédiates d'un même mot.
 * « Amen », « Alléluia » et les termes grecs/hébreux ne sont JAMAIS retirés.
 */
export function cleanSegment(raw: string): string {
  return raw
    .replace(FILLERS, "")
    .replace(/\b(\p{L}{2,})(\s+\1\b)+/giu, "$1")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function words(s: string) {
  return s.toLowerCase().normalize("NFC").split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
}

/** Contrôle d'intégrité : le texte épuré doit conserver au moins 97 % des mots significatifs. Sinon : brut. */
export function cleanWithIntegrity(raw: string): { text: string; cleaned: boolean } {
  const cleaned = cleanSegment(raw);
  const rawWords = new Set(words(raw).filter((w) => !/^(euh+|heu+|hum+|bah|ben)$/.test(w)));
  const kept = new Set(words(cleaned));
  let present = 0;
  for (const w of rawWords) if (kept.has(w)) present++;
  const ratio = rawWords.size ? present / rawWords.size : 1;
  return ratio >= 0.97 ? { text: cleaned, cleaned: true } : { text: raw, cleaned: false };
}

/** Identifiant YouTube canonique depuis une URL d'hôte autorisé (anti-SSRF : aucune requête vers l'URL fournie). */
export function parseYouTubeId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? null;
  else if (["www.youtube.com", "youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      id = m?.[1] ?? null;
    }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
