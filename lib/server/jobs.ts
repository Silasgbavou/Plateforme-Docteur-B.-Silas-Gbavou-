import "server-only";
import { db } from "./db";
import { newId, nowIso } from "./ids";

export type JobStatus = "en_attente" | "en_cours" | "termine" | "echec" | "abandonne";

export interface Job {
  id: string;
  type: string;
  payload: string;
  dedupeKey: string | null;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  runAfter: number;
  leaseOwner: string | null;
  leaseUntil: number | null;
  progressDone: number;
  progressTotal: number | null;
  checkpoint: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

const COLS = `id, type, payload, dedupe_key AS dedupeKey, status, attempts, max_attempts AS maxAttempts,
  run_after AS runAfter, lease_owner AS leaseOwner, lease_until AS leaseUntil, progress_done AS progressDone,
  progress_total AS progressTotal, checkpoint, last_error AS lastError, created_at AS createdAt,
  updated_at AS updatedAt, finished_at AS finishedAt`;

/** Backoff historique conservé : 60/120/240/480/900 s, avec gigue de ±20 %. */
export const BACKOFF_SECONDS = [60, 120, 240, 480, 900];
export const LEASE_SECONDS = 120;

export function backoffMs(attempt: number, random = Math.random): number {
  const base = BACKOFF_SECONDS[Math.min(attempt - 1, BACKOFF_SECONDS.length - 1)] ?? 900;
  const jitter = 1 + (random() * 0.4 - 0.2);
  return Math.round(base * jitter * 1000);
}

/**
 * Ajoute une tâche. Idempotent : avec une clé de déduplication, une tâche active
 * (en attente / en cours) existante est renvoyée au lieu d'en créer une seconde.
 */
export function enqueue(type: string, payload: unknown, dedupeKey?: string, maxAttempts = 6): Job {
  const d = db();
  return d.transaction(() => {
    if (dedupeKey) {
      const existing = d.prepare(`SELECT ${COLS} FROM jobs WHERE dedupe_key = ?`).get(dedupeKey) as Job | undefined;
      if (existing && (existing.status === "en_attente" || existing.status === "en_cours")) return existing;
      if (existing) d.prepare("UPDATE jobs SET dedupe_key = NULL WHERE id = ?").run(existing.id);
    }
    const id = newId();
    d.prepare(
      `INSERT INTO jobs (id, type, payload, dedupe_key, status, max_attempts, run_after) VALUES (?, ?, ?, ?, 'en_attente', ?, ?)`,
    ).run(id, type, JSON.stringify(payload), dedupeKey ?? null, maxAttempts, Date.now());
    return d.prepare(`SELECT ${COLS} FROM jobs WHERE id = ?`).get(id) as Job;
  })();
}

/** Réserve atomiquement la prochaine tâche prête (ou dont le bail a expiré). */
export function claimNext(owner: string, types?: string[]): Job | null {
  const d = db();
  const now = Date.now();
  return d.transaction(() => {
    const typeFilter = types?.length ? `AND type IN (${types.map(() => "?").join(",")})` : "";
    const row = d.prepare(
      `SELECT ${COLS} FROM jobs
       WHERE ((status = 'en_attente' AND run_after <= ?) OR (status = 'en_cours' AND lease_until < ?)) ${typeFilter}
       ORDER BY run_after LIMIT 1`,
    ).get(now, now, ...(types ?? [])) as Job | undefined;
    if (!row) return null;
    d.prepare(
      `UPDATE jobs SET status = 'en_cours', lease_owner = ?, lease_until = ?, attempts = attempts + 1, updated_at = ? WHERE id = ?`,
    ).run(owner, now + LEASE_SECONDS * 1000, nowIso(), row.id);
    return d.prepare(`SELECT ${COLS} FROM jobs WHERE id = ?`).get(row.id) as Job;
  })();
}

/** Prolonge le bail et enregistre un point de reprise. Échoue si le bail a été perdu. */
export function heartbeat(job: Job, owner: string, progress: { done?: number; total?: number; checkpoint?: unknown }) {
  const res = db().prepare(
    `UPDATE jobs SET lease_until = ?, progress_done = COALESCE(?, progress_done), progress_total = COALESCE(?, progress_total),
       checkpoint = COALESCE(?, checkpoint), updated_at = ? WHERE id = ? AND lease_owner = ? AND status = 'en_cours'`,
  ).run(
    Date.now() + LEASE_SECONDS * 1000,
    progress.done ?? null,
    progress.total ?? null,
    progress.checkpoint === undefined ? null : JSON.stringify(progress.checkpoint),
    nowIso(),
    job.id,
    owner,
  );
  if (res.changes === 0) throw new LeaseLostError(job.id);
}

export class LeaseLostError extends Error {
  constructor(id: string) {
    super(`Bail perdu pour la tâche ${id}`);
  }
}

/** Erreur temporaire (429/503…) : replanifie SANS consommer une tentative au-delà du plafond. */
export class RetryLaterError extends Error {
  constructor(message: string, public retryAfterMs: number) {
    super(message);
  }
}

export function complete(job: Job, owner: string) {
  db().prepare(
    `UPDATE jobs SET status = 'termine', lease_owner = NULL, lease_until = NULL, last_error = NULL, finished_at = ?, updated_at = ?
     WHERE id = ? AND lease_owner = ?`,
  ).run(nowIso(), nowIso(), job.id, owner);
}

export function failOrRetry(job: Job, owner: string, error: unknown) {
  const message = sanitizeError(error);
  const d = db();
  if (error instanceof RetryLaterError) {
    // Les limitations de débit ne doivent pas épuiser les tentatives : on rend celle-ci.
    d.prepare(
      `UPDATE jobs SET status = 'en_attente', attempts = MAX(attempts - 1, 0), run_after = ?, lease_owner = NULL, lease_until = NULL,
       last_error = ?, updated_at = ? WHERE id = ? AND lease_owner = ?`,
    ).run(Date.now() + error.retryAfterMs, message, nowIso(), job.id, owner);
    return;
  }
  if (job.attempts >= job.maxAttempts) {
    // Dead-letter : état terminal visible dans /gestion, relance manuelle possible.
    d.prepare(
      `UPDATE jobs SET status = 'echec', lease_owner = NULL, lease_until = NULL, last_error = ?, finished_at = ?, updated_at = ? WHERE id = ? AND lease_owner = ?`,
    ).run(message, nowIso(), nowIso(), job.id, owner);
    return;
  }
  d.prepare(
    `UPDATE jobs SET status = 'en_attente', run_after = ?, lease_owner = NULL, lease_until = NULL, last_error = ?, updated_at = ? WHERE id = ? AND lease_owner = ?`,
  ).run(Date.now() + backoffMs(job.attempts), message, nowIso(), job.id, owner);
}

/** Relance manuelle d'une tâche en échec (administrateur). */
export function retryJob(id: string): boolean {
  const res = db().prepare(
    `UPDATE jobs SET status = 'en_attente', attempts = 0, run_after = ?, last_error = NULL, finished_at = NULL, updated_at = ?
     WHERE id = ? AND status IN ('echec','abandonne')`,
  ).run(Date.now(), nowIso(), id);
  return res.changes > 0;
}

export function cancelJob(id: string): boolean {
  const res = db().prepare(
    `UPDATE jobs SET status = 'abandonne', lease_owner = NULL, lease_until = NULL, finished_at = ?, updated_at = ? WHERE id = ? AND status = 'en_attente'`,
  ).run(nowIso(), nowIso(), id);
  return res.changes > 0;
}

export function getJob(id: string): Job | null {
  return (db().prepare(`SELECT ${COLS} FROM jobs WHERE id = ?`).get(id) as Job | undefined) ?? null;
}

export function listJobs(limit = 50, before?: string): Job[] {
  if (before) {
    return db().prepare(`SELECT ${COLS} FROM jobs WHERE created_at < ? ORDER BY created_at DESC LIMIT ?`).all(before, limit) as Job[];
  }
  return db().prepare(`SELECT ${COLS} FROM jobs ORDER BY created_at DESC LIMIT ?`).all(limit) as Job[];
}

/** Message d'erreur expurgé : ni clé, ni URL complète avec paramètres, longueur bornée. */
export function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/key=[^&\s]+/gi, "key=***")
    .replace(/(AIza|sk-)[A-Za-z0-9_-]{8,}/g, "***")
    .replace(/Bearer\s+\S+/gi, "Bearer ***")
    .slice(0, 500);
}
