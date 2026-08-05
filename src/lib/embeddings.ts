/**
 * Couche d'embeddings à deux moteurs.
 *
 * 1. Voyage AI (recommandé en production) si VOYAGE_API_KEY est défini.
 *    Anthropic ne fournit pas d'API d'embeddings ; Voyage est le partenaire
 *    recommandé et se combine parfaitement avec Claude pour la génération.
 * 2. Moteur local déterministe (repli) : projection de n-grammes hachés sur
 *    un vecteur de 512 dimensions. Aucune dépendance réseau, résultats stables,
 *    suffisant pour amorcer le corpus et pour le développement.
 *
 * Dans les deux cas la recherche est *hybride* (voir rag.ts) : le score
 * lexical complète le score vectoriel, ce qui garantit une pertinence
 * correcte même sans clé Voyage.
 */

export const LOCAL_DIM = 512;

export interface EmbeddingResult {
  vectors: number[][];
  model: string;
}

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';

export function embeddingModelName(): string {
  return process.env.VOYAGE_API_KEY
    ? process.env.VOYAGE_MODEL || 'voyage-3.5'
    : 'local-hash-512';
}

export async function embedTexts(
  texts: string[],
  inputType: 'document' | 'query' = 'document',
): Promise<EmbeddingResult> {
  if (texts.length === 0) return { vectors: [], model: embeddingModelName() };

  const apiKey = process.env.VOYAGE_API_KEY;
  if (apiKey) {
    try {
      return await voyageEmbed(texts, inputType, apiKey);
    } catch (error) {
      console.warn('[embeddings] Voyage indisponible, repli sur le moteur local :', error);
    }
  }
  return { vectors: texts.map(localEmbed), model: 'local-hash-512' };
}

export async function embedQuery(text: string): Promise<number[]> {
  const { vectors } = await embedTexts([text], 'query');
  return vectors[0] ?? localEmbed(text);
}

async function voyageEmbed(
  texts: string[],
  inputType: 'document' | 'query',
  apiKey: string,
): Promise<EmbeddingResult> {
  const model = process.env.VOYAGE_MODEL || 'voyage-3.5';
  const out: number[][] = [];
  // L'API accepte des lots ; on reste prudent sur la taille.
  const BATCH = 64;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const response = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: batch, model, input_type: inputType }),
    });
    if (!response.ok) {
      throw new Error(`Voyage ${response.status}: ${await response.text()}`);
    }
    const json = (await response.json()) as {
      data: { index: number; embedding: number[] }[];
    };
    const ordered = [...json.data].sort((a, b) => a.index - b.index);
    out.push(...ordered.map((d) => normalize(d.embedding)));
  }
  return { vectors: out, model };
}

// ───────────────────────── Moteur local déterministe ─────────────────────

/** Découpe en tokens normalisés (sans accents, sans mots vides très courts). */
export function tokenize(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function hash32(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Projection hachée : unigrammes + bigrammes → vecteur normalisé. */
export function localEmbed(text: string): number[] {
  const vector = new Array<number>(LOCAL_DIM).fill(0);
  const tokens = tokenize(text);
  const push = (term: string, weight: number) => {
    const h = hash32(term);
    const idx = h % LOCAL_DIM;
    const sign = (h >>> 31) & 1 ? -1 : 1;
    vector[idx] += sign * weight;
  };
  for (let i = 0; i < tokens.length; i += 1) {
    push(tokens[i], 1);
    if (i + 1 < tokens.length) push(`${tokens[i]}_${tokens[i + 1]}`, 0.6);
  }
  return normalize(vector);
}

export function normalize(vector: number[]): number[] {
  let sum = 0;
  for (const v of vector) sum += v * v;
  const norm = Math.sqrt(sum);
  if (norm === 0) return vector;
  return vector.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i += 1) dot += a[i] * b[i];
  return dot; // vecteurs déjà normalisés
}

const STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'a', 'au', 'aux',
  'ce', 'ces', 'cet', 'cette', 'dans', 'par', 'pour', 'sur', 'sous', 'avec', 'sans',
  'que', 'qui', 'quoi', 'dont', 'ne', 'pas', 'plus', 'est', 'sont', 'etait', 'etaient',
  'ete', 'etre', 'avoir', 'il', 'elle', 'ils', 'elles', 'nous', 'vous', 'je', 'tu',
  'son', 'sa', 'ses', 'leur', 'leurs', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
  'en', 'y', 'se', 'si', 'mais', 'donc', 'or', 'ni', 'car', 'the', 'of', 'to', 'and',
]);
