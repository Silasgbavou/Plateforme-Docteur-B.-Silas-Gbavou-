import { completeJson } from '@/lib/anthropic';
import { prisma } from '@/lib/prisma';
import { PILLARS, taxonomyOutline, type PillarKey } from '@/lib/taxonomy';

/**
 * Classification automatique d'un contenu dans la règle des 3 piliers.
 *
 * L'IA analyse le titre + la transcription (ou le corps du texte) et déduit :
 *   - le pilier principal (Prophétique / Spirituel / Doctrinal) ;
 *   - la sous-rubrique la plus pertinente à l'intérieur de ce pilier ;
 *   - un résumé, des mots-clés et une justification consultable par l'admin.
 *
 * En l'absence de clé API, un classificateur lexical de repli prend le relais
 * afin que l'import ne soit jamais bloquant.
 */

export interface Classification {
  pillarKey: PillarKey;
  subRubricSlug: string;
  summary: string;
  keywords: string[];
  rationale: string;
  confidence: number;
  method: 'ia' | 'lexical';
}

const SCHEMA = {
  type: 'object',
  properties: {
    pillarKey: { type: 'string', enum: ['PROPHETIQUE', 'SPIRITUEL', 'DOCTRINAL'] },
    subRubricSlug: { type: 'string' },
    summary: { type: 'string' },
    keywords: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
    confidence: { type: 'number' },
  },
  required: ['pillarKey', 'subRubricSlug', 'summary', 'keywords', 'rationale', 'confidence'],
  additionalProperties: false,
} as const;

const SYSTEM = `Tu es le documentaliste du ministère du Docteur B. Silas Gbavou. Tu classes chaque enseignement dans une arborescence stricte à trois grandes rubriques, dites « les 3 piliers ».

Arborescence officielle (pilier, puis sous-rubriques avec leurs mots-clés) :
${taxonomyOutline()}

Consignes :
- Choisis UN seul pilier, celui qui domine réellement l'enseignement.
- Choisis UNE sous-rubrique, obligatoirement parmi celles du pilier choisi (utilise exactement le slug).
- « summary » : 2 à 3 phrases en français, fidèles au contenu, sans embellissement.
- « keywords » : 4 à 8 termes en minuscules issus du contenu.
- « rationale » : une phrase expliquant le choix, destinée à l'administrateur.
- « confidence » : entre 0 et 1.
- Ne t'appuie que sur le texte fourni. Si le texte est trop pauvre, choisis la rubrique la plus plausible et abaisse la confiance.`;

export async function classifyContent(input: {
  title: string;
  text: string;
  description?: string;
}): Promise<Classification> {
  const body = truncate(
    [input.title, input.description ?? '', input.text].filter(Boolean).join('\n\n'),
    24000,
  );

  try {
    const result = await completeJson<Omit<Classification, 'method'>>({
      system: SYSTEM,
      prompt: `Classe cet enseignement.\n\n<enseignement>\n${body}\n</enseignement>`,
      schema: SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 1200,
      effort: 'medium',
    });
    const validated = validate(result);
    if (validated) return { ...validated, method: 'ia' };
  } catch (error) {
    console.warn('[classify] repli lexical :', error);
  }

  return lexicalFallback(input.title, body);
}

function validate(result: Omit<Classification, 'method'>): Omit<Classification, 'method'> | null {
  const pillar = PILLARS.find((p) => p.key === result.pillarKey);
  if (!pillar) return null;
  const sub = pillar.subRubrics.find((s) => s.slug === result.subRubricSlug);
  if (!sub) {
    // Le pilier est valide mais la sous-rubrique ne l'est pas : on retombe
    // sur la première sous-rubrique plutôt que d'échouer.
    return {
      ...result,
      subRubricSlug: pillar.subRubrics[0].slug,
      confidence: Math.min(result.confidence ?? 0.5, 0.5),
    };
  }
  return result;
}

/** Classificateur de repli : score par recouvrement de mots-clés. */
export function lexicalFallback(title: string, text: string): Classification {
  const haystack = `${title} ${text}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  let best = { pillar: PILLARS[0], sub: PILLARS[0].subRubrics[0], score: 0 };
  for (const pillar of PILLARS) {
    for (const sub of pillar.subRubrics) {
      let score = 0;
      for (const keyword of sub.keywords) {
        const needle = keyword
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase();
        const occurrences = haystack.split(needle).length - 1;
        if (occurrences > 0) score += 1 + Math.log(occurrences);
      }
      if (score > best.score) best = { pillar, sub, score };
    }
  }

  return {
    pillarKey: best.pillar.key,
    subRubricSlug: best.sub.slug,
    summary: truncate(text.replace(/\s+/g, ' ').trim(), 320),
    keywords: best.sub.keywords.slice(0, 5),
    rationale:
      best.score > 0
        ? `Classement lexical automatique (score ${best.score.toFixed(1)}) — à confirmer par l'administrateur.`
        : "Aucun mot-clé déterminant : rubrique par défaut, à corriger manuellement.",
    confidence: best.score > 0 ? Math.min(0.6, 0.2 + best.score / 12) : 0.15,
    method: 'lexical',
  };
}

/** Résout la classification en identifiants base de données. */
export async function resolveClassification(classification: Classification): Promise<{
  pillarId: string;
  subRubricId: string | null;
}> {
  const pillar = await prisma.pillar.findUnique({
    where: { key: classification.pillarKey },
    include: { subRubrics: true },
  });
  if (!pillar) throw new Error(`Pilier inconnu : ${classification.pillarKey}`);
  const sub = pillar.subRubrics.find((s) => s.slug === classification.subRubricSlug);
  return { pillarId: pillar.id, subRubricId: sub?.id ?? null };
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}
