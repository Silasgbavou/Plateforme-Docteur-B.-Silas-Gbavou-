import { prisma } from '@/lib/prisma';
import { chunkText } from '@/lib/chunk';
import { cosineSimilarity, embedQuery, embedTexts, tokenize } from '@/lib/embeddings';
import { CONTENT_TYPE_LABEL, type ContentType } from '@/lib/taxonomy';

/**
 * Cœur du RAG (Retrieval-Augmented Generation).
 *
 * Contrainte absolue du ministère : l'IA ne répond QUE sur la base du corpus
 * du Docteur B. Silas Gbavou. Aucune connaissance externe n'est autorisée —
 * la consigne est portée par le prompt système ET par le fait que seuls les
 * extraits récupérés sont fournis au modèle.
 */

export interface RetrievedChunk {
  chunkId: string;
  contentId: string;
  index: number;
  text: string;
  heading: string | null;
  score: number;
  content: {
    title: string;
    slug: string;
    type: string;
    pillarTitle: string;
    pillarSlug: string;
    subRubricTitle: string | null;
  };
}

export interface RetrievalScope {
  /** Restreint la recherche à un pilier. */
  pillarId?: string;
  /** Restreint la recherche à une sous-rubrique. */
  subRubricId?: string;
  /** Restreint la recherche à un seul contenu (vidéo, audio, livre, article). */
  contentId?: string;
  /** Restreint par type de contenu. */
  types?: ContentType[];
}

// ─────────────────────────────── Indexation ──────────────────────────────

/** Texte indexable d'un contenu : corps de l'écrit ou transcription. */
export function indexableText(content: {
  title: string;
  summary: string | null;
  body: string | null;
  transcript: string | null;
}): string {
  const parts = [content.title, content.summary ?? '', content.body ?? '', content.transcript ?? ''];
  return parts.filter(Boolean).join('\n\n').trim();
}

/** (Ré)indexe un contenu : supprime ses chunks puis recalcule les vecteurs. */
export async function indexContent(contentId: string): Promise<number> {
  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) throw new Error('Contenu introuvable.');

  const source = indexableText(content);
  await prisma.chunk.deleteMany({ where: { contentId } });

  if (!source || source.length < 80) {
    await prisma.content.update({
      where: { id: contentId },
      data: { indexedAt: new Date() },
    });
    return 0;
  }

  const pieces = chunkText(source, content.title);
  const { vectors, model } = await embedTexts(
    pieces.map((p) => (p.heading ? `${p.heading}\n${p.text}` : p.text)),
    'document',
  );

  await prisma.chunk.createMany({
    data: pieces.map((piece, i) => ({
      contentId,
      index: piece.index,
      text: piece.text,
      heading: piece.heading ?? null,
      charCount: piece.text.length,
      embedding: JSON.stringify(vectors[i] ?? []),
      model,
    })),
  });

  await prisma.content.update({
    where: { id: contentId },
    data: { indexedAt: new Date() },
  });

  return pieces.length;
}

/** Réindexe tout le corpus publié. Renvoie le nombre de fragments produits. */
export async function reindexAll(): Promise<{ contents: number; chunks: number }> {
  const contents = await prisma.content.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true },
  });
  let chunks = 0;
  for (const content of contents) {
    chunks += await indexContent(content.id);
  }
  return { contents: contents.length, chunks };
}

// ─────────────────────────────── Recherche ───────────────────────────────

const TOP_K = 8;
const CANDIDATE_LIMIT = 4000;

/**
 * Recherche hybride : similarité cosinus (sémantique) + recouvrement lexical
 * pondéré (BM25 simplifié). L'hybridation garantit des résultats pertinents
 * même lorsque le moteur d'embeddings local sert de repli.
 */
export async function retrieve(
  question: string,
  scope: RetrievalScope = {},
  topK = TOP_K,
): Promise<RetrievedChunk[]> {
  const contentWhere: Record<string, unknown> = { status: 'PUBLISHED' };
  if (scope.contentId) contentWhere.id = scope.contentId;
  if (scope.pillarId) contentWhere.pillarId = scope.pillarId;
  if (scope.subRubricId) contentWhere.subRubricId = scope.subRubricId;
  if (scope.types?.length) contentWhere.type = { in: scope.types };

  const rows = await prisma.chunk.findMany({
    where: { content: contentWhere },
    take: CANDIDATE_LIMIT,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      contentId: true,
      index: true,
      text: true,
      heading: true,
      embedding: true,
      content: {
        select: {
          title: true,
          slug: true,
          type: true,
          pillar: { select: { title: true, slug: true } },
          subRubric: { select: { title: true } },
        },
      },
    },
  });

  if (rows.length === 0) return [];

  const queryVector = await embedQuery(question);
  const queryTokens = new Set(tokenize(question));
  const idf = buildIdf(rows.map((r) => r.text));

  const scored = rows.map((row) => {
    let vector: number[] = [];
    try {
      vector = JSON.parse(row.embedding) as number[];
    } catch {
      vector = [];
    }
    const semantic = vector.length ? cosineSimilarity(queryVector, vector) : 0;
    const lexical = lexicalScore(row.text, queryTokens, idf);
    // 65 % sémantique / 35 % lexical : robuste dans les deux configurations.
    const score = 0.65 * semantic + 0.35 * lexical;
    return { row, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Diversification : au plus 3 fragments par contenu, pour éviter qu'une
  // seule vidéo ne monopolise le contexte.
  const perContent = new Map<string, number>();
  const selected: RetrievedChunk[] = [];
  for (const { row, score } of scored) {
    if (score <= 0.02) continue;
    const used = perContent.get(row.contentId) ?? 0;
    if (used >= 3) continue;
    perContent.set(row.contentId, used + 1);
    selected.push({
      chunkId: row.id,
      contentId: row.contentId,
      index: row.index,
      text: row.text,
      heading: row.heading,
      score,
      content: {
        title: row.content.title,
        slug: row.content.slug,
        type: row.content.type,
        pillarTitle: row.content.pillar.title,
        pillarSlug: row.content.pillar.slug,
        subRubricTitle: row.content.subRubric?.title ?? null,
      },
    });
    if (selected.length >= topK) break;
  }

  return selected;
}

function buildIdf(texts: string[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const text of texts) {
    for (const token of new Set(tokenize(text))) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }
  const n = texts.length || 1;
  const idf = new Map<string, number>();
  for (const [token, count] of df) {
    idf.set(token, Math.log(1 + (n - count + 0.5) / (count + 0.5)));
  }
  return idf;
}

function lexicalScore(text: string, queryTokens: Set<string>, idf: Map<string, number>): number {
  if (queryTokens.size === 0) return 0;
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);

  let score = 0;
  let maxScore = 0;
  const k1 = 1.4;
  const b = 0.72;
  const avgLen = 180;
  const norm = 1 - b + b * (tokens.length / avgLen);

  for (const q of queryTokens) {
    const weight = idf.get(q) ?? 1.2;
    maxScore += weight;
    const tf = counts.get(q) ?? 0;
    if (tf === 0) continue;
    score += weight * ((tf * (k1 + 1)) / (tf + k1 * norm));
  }
  return maxScore > 0 ? Math.min(1, score / maxScore) : 0;
}

// ────────────────────────── Construction du prompt ───────────────────────

export const RAG_SYSTEM_PROMPT = `Tu es « Le Serviteur », l'assistant pédagogique officiel de la plateforme du Docteur B. Silas Gbavou — Docteur de la Parole et de la Saine Doctrine, Homme Prophétique, Formateur au Prophétique, Dispensateur des Mystères de DIEU et des Réalités Spirituelles du Sacerdoce en CHRIST.

RÈGLE ABSOLUE ET NON NÉGOCIABLE
Tu réponds EXCLUSIVEMENT à partir des extraits du corpus du Docteur B. Silas Gbavou qui te sont fournis dans le bloc <corpus>. Tu n'utilises jamais de connaissance extérieure, ni tes connaissances générales sur la théologie, la Bible ou tout autre sujet, pour compléter, corriger ou enrichir une réponse.
- Si les extraits ne contiennent pas la réponse, tu le dis clairement : « Cet enseignement n'est pas encore couvert par le corpus disponible sur la plateforme », puis tu proposes les rubriques ou contenus les plus proches et tu invites l'internaute à écrire au Bureau de consultation.
- Tu ne devines jamais. Tu n'inventes aucune référence biblique, aucune citation, aucun titre d'enseignement qui ne figure pas dans les extraits.
- Tu ne contredis jamais l'enseignement du Docteur et tu n'y ajoutes aucune opinion personnelle.

MISSION
1. Répondre aux questions des internautes sur les enseignements.
2. Produire des résumés et des synthèses fidèles.
3. Accompagner pédagogiquement : expliquer, structurer, proposer un parcours d'étude à l'intérieur du corpus.

ARBORESCENCE
Tout le corpus est organisé en trois grandes rubriques : l'Enseignement Prophétique, l'Enseignement Spirituel et l'Enseignement Doctrinal. Toute thématique (prière, jeûne, sainteté, discernement…) est une sous-rubrique de l'une d'elles. Quand c'est utile, situe la réponse dans cette arborescence.

STYLE
- Français soutenu, respectueux, clair et pédagogique. Vouvoiement.
- Écris « DIEU », « CHRIST » et « SEIGNEUR » en majuscules, comme le Docteur.
- Structure les réponses longues avec des intertitres courts et des listes quand cela aide la compréhension.
- Cite tes sources en fin de réponse sous la forme : Source : « Titre de l'enseignement ».
- Réponses concises par défaut ; développe seulement si la question l'exige.
- Tu es un outil d'étude : tu ne prophétises pas, tu ne donnes pas de parole personnelle, tu ne délivres aucun diagnostic spirituel individuel. Pour toute demande personnelle, oriente vers le Bureau de consultation du site.`;

export function buildCorpusBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return '<corpus>\n(Aucun extrait pertinent n\'a été trouvé dans le corpus pour cette question.)\n</corpus>';
  }
  const body = chunks
    .map((chunk, i) => {
      const typeLabel = CONTENT_TYPE_LABEL[chunk.content.type as ContentType] ?? chunk.content.type;
      const location = [chunk.content.pillarTitle, chunk.content.subRubricTitle]
        .filter(Boolean)
        .join(' › ');
      return [
        `<extrait n="${i + 1}">`,
        `titre: ${chunk.content.title}`,
        `type: ${typeLabel}`,
        `rubrique: ${location}`,
        chunk.heading ? `section: ${chunk.heading}` : null,
        'texte:',
        chunk.text,
        '</extrait>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
  return `<corpus>\n${body}\n</corpus>`;
}

export function sourcesFromChunks(chunks: RetrievedChunk[]) {
  const seen = new Map<string, { id: string; title: string; slug: string; type: string; pillarSlug: string; score: number }>();
  for (const chunk of chunks) {
    const existing = seen.get(chunk.contentId);
    if (!existing || chunk.score > existing.score) {
      seen.set(chunk.contentId, {
        id: chunk.contentId,
        title: chunk.content.title,
        slug: chunk.content.slug,
        type: chunk.content.type,
        pillarSlug: chunk.content.pillarSlug,
        score: Number(chunk.score.toFixed(4)),
      });
    }
  }
  return [...seen.values()].sort((a, b) => b.score - a.score);
}
