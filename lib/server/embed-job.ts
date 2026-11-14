import "server-only";
import { db } from "./db";
import { embedTexts, embeddingConfigured, embeddingSpace, toBlob } from "./embeddings";
import { heartbeat, RetryLaterError, type Job } from "./jobs";
import { acquireLlmSlot } from "./llm/budget";
import { LlmError } from "./llm/errors";
import { env } from "./env";

export const EMBED_BATCH = 24;
const PAUSE_MS = 20_000;

/**
 * Tâche durable d'embeddings. Chaque lot est validé (dimension) puis écrit dans une transaction :
 * le point de reprise est l'état de la base elle-même (passages sans vecteur dans l'espace actif),
 * donc une reprise après panne ne recalcule ni ne duplique rien.
 */
export async function runEmbedJob(job: Job, owner: string, signal: AbortSignal) {
  if (!embeddingConfigured()) return;
  const { space } = JSON.parse(job.payload) as { space: string };
  if (space !== embeddingSpace()) return; // espace obsolète : une nouvelle tâche existe pour l'espace actif
  const d = db();
  const missingSql = `FROM passages p WHERE NOT EXISTS (SELECT 1 FROM passage_embeddings pe WHERE pe.passage_id = p.id AND pe.space = ?)`;
  const total = (d.prepare("SELECT COUNT(*) AS n FROM passages").get() as { n: number }).n;
  for (;;) {
    if (signal.aborted) throw new Error("Arrêt du worker");
    const batch = d.prepare(`SELECT p.id, p.text ${missingSql} ORDER BY p.rowid LIMIT ?`).all(space, EMBED_BATCH) as { id: string; text: string }[];
    const missing = (d.prepare(`SELECT COUNT(*) AS n ${missingSql}`).get(space) as { n: number }).n;
    heartbeat(job, owner, { done: total - missing, total });
    if (!batch.length) return;
    const slot = acquireLlmSlot("indexation");
    if (!slot.ok) throw new RetryLaterError("Budget global atteint (priorité aux questions).", slot.retryAfterMs);
    let vectors: Float32Array[];
    try {
      vectors = await embedTexts(batch.map((b) => b.text), "document", signal);
    } catch (e) {
      if (e instanceof LlmError && (e.kind === "surcharge" || e.kind === "quota_journalier")) {
        const wait = e.retryAfterMs ?? (e.kind === "quota_journalier" ? 3600_000 : 60_000);
        throw new RetryLaterError(e.message, wait * (1 + Math.random() * 0.2));
      }
      throw e;
    }
    const dims = env().EMBEDDING_DIMENSIONS;
    d.transaction(() => {
      const ins = d.prepare("INSERT OR IGNORE INTO passage_embeddings (passage_id, space, dimensions, vector) VALUES (?, ?, ?, ?)");
      batch.forEach((b, i) => ins.run(b.id, space, dims, toBlob(vectors[i]!)));
    })();
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
}

/** Progression réelle de l'index actif, calculée depuis la base. */
export function indexProgress() {
  const d = db();
  const total = (d.prepare("SELECT COUNT(*) AS n FROM passages").get() as { n: number }).n;
  if (!embeddingConfigured()) return { configured: false as const, total, embedded: 0, space: null };
  const space = embeddingSpace();
  const embedded = (d.prepare("SELECT COUNT(*) AS n FROM passage_embeddings pe JOIN passages p ON p.id = pe.passage_id WHERE pe.space = ?").get(space) as { n: number }).n;
  return { configured: true as const, total, embedded, space };
}
