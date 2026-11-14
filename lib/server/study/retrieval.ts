import "server-only";
import { db } from "../db";
import { embedTexts, embeddingConfigured, embeddingSpace, fromBlob, dot } from "../embeddings";

export interface Passage {
  id: string;
  sourceType: "edition" | "video" | "article";
  workId: string | null;
  editionId: string | null;
  videoId: string | null;
  pageStart: number | null;
  startSec: number | null;
  endSec: number | null;
  pillar: string | null;
  text: string;
  title: string;
  editionLabel: string | null;
}

export interface RetrievalOptions {
  context: "textes" | "predications";
  workId?: string | null;
  limit?: number;
}

const STOPWORDS = new Set(
  "a au aux avec ce ces cet cette dans de des du elle en est et eux il ils je la le les leur lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sont sur ta te tes toi ton tu un une vos votre vous y l d j c n s m t qu est-ce quoi comment pourquoi quel quelle quels quelles dont donc car si plus tres tout tous toute toutes etre avoir fait faire peut doit selon parle parler dit dire explique expliquer".split(" "),
);

/** Requête FTS5 sûre : termes alphanumériques uniquement, entre guillemets, combinés en OU. */
export function buildFtsQuery(question: string): string | null {
  const terms = question
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  const unique = [...new Set(terms)].slice(0, 16);
  if (!unique.length) return null;
  return unique.map((t) => `"${t}"`).join(" OR ");
}

const PASSAGE_SELECT = `p.id, p.source_type AS sourceType, p.work_id AS workId, p.edition_id AS editionId, p.video_id AS videoId,
  p.page_start AS pageStart, p.start_sec AS startSec, p.end_sec AS endSec, p.pillar, p.text,
  COALESCE(w.title, v.title, a.title, '') AS title, e.label AS editionLabel`;

/** Périmètre : uniquement éditions publiées d'œuvres publiées, vidéos et écrits publiés. Filtre AVANT sélection. */
function scopeClause(opts: RetrievalOptions): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  let sql =
    opts.context === "predications"
      ? `p.source_type = 'video' AND v.status = 'publiee'`
      : `((p.source_type = 'edition' AND e.status = 'publiee' AND w.status = 'publie') OR (p.source_type = 'article' AND a.status = 'publie'))`;
  if (opts.workId && opts.context === "textes") {
    sql += ` AND p.work_id = ?`;
    params.push(opts.workId);
  }
  return { sql, params };
}

const JOINS = `FROM passages p
  LEFT JOIN editions e ON e.id = p.edition_id
  LEFT JOIN works w ON w.id = p.work_id
  LEFT JOIN teaching_videos v ON v.id = p.video_id
  LEFT JOIN articles a ON a.id = p.article_id`;

export function lexicalSearch(question: string, opts: RetrievalOptions, limit = 30): Passage[] {
  const fts = buildFtsQuery(question);
  if (!fts) return [];
  const scope = scopeClause(opts);
  return db()
    .prepare(
      `SELECT ${PASSAGE_SELECT} FROM passages_fts f JOIN passages p ON p.rowid = f.rowid
       ${JOINS.replace("FROM passages p", "")}
       WHERE passages_fts MATCH ? AND ${scope.sql}
       ORDER BY bm25(passages_fts) LIMIT ?`,
    )
    .all(fts, ...scope.params, limit) as Passage[];
}

export async function semanticSearch(question: string, opts: RetrievalOptions, signal: AbortSignal, limit = 30): Promise<Passage[]> {
  if (!embeddingConfigured()) return [];
  const space = embeddingSpace();
  const scope = scopeClause(opts);
  const rows = db()
    .prepare(`SELECT ${PASSAGE_SELECT}, pe.vector ${JOINS} JOIN passage_embeddings pe ON pe.passage_id = p.id AND pe.space = ? WHERE ${scope.sql}`)
    .all(space, ...scope.params) as (Passage & { vector: Buffer })[];
  if (!rows.length) return [];
  const [q] = await embedTexts([question], "requete", signal);
  if (!q) return [];
  return rows
    .map((r) => ({ r, s: dot(q, fromBlob(r.vector)) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ r }) => {
      const { vector, ...p } = r;
      void vector;
      return p;
    });
}

/** Fusion par rangs réciproques (RRF, k = 60). */
export function reciprocalRankFusion(lists: Passage[][], limit: number): Passage[] {
  const scores = new Map<string, { p: Passage; s: number }>();
  for (const list of lists) {
    list.forEach((p, rank) => {
      const cur = scores.get(p.id) ?? { p, s: 0 };
      cur.s += 1 / (60 + rank + 1);
      scores.set(p.id, cur);
    });
  }
  return [...scores.values()].sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.p);
}

export async function retrieve(question: string, opts: RetrievalOptions, signal: AbortSignal): Promise<{ passages: Passage[]; semantic: boolean }> {
  const limit = opts.limit ?? 8;
  const lexical = lexicalSearch(question, opts);
  let semantic: Passage[] = [];
  try {
    semantic = await semanticSearch(question, opts, signal);
  } catch {
    semantic = []; // la recherche lexicale reste disponible si les embeddings échouent
  }
  return { passages: reciprocalRankFusion([lexical, semantic], limit), semantic: semantic.length > 0 };
}

export function corpusCounts() {
  return db()
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM passages p JOIN editions e ON e.id = p.edition_id JOIN works w ON w.id = p.work_id WHERE e.status = 'publiee' AND w.status = 'publie') AS textes,
        (SELECT COUNT(*) FROM passages p JOIN teaching_videos v ON v.id = p.video_id WHERE v.status = 'publiee') AS predications`,
    )
    .get() as { textes: number; predications: number };
}
