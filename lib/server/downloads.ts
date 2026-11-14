import "server-only";
import { db } from "./db";
import { newId } from "./ids";
import { CONSENT_VERSION, type downloadRequestSchema } from "@/lib/domain/download-schema";
import type { z } from "zod";
import { getPublishedEdition } from "./catalog";
import { ApiError } from "./http";

type Input = z.output<typeof downloadRequestSchema>;

/**
 * Enregistre la demande AVANT de fournir le fichier, avec l'édition exacte.
 * Idempotent : la même clé renvoie la même demande (double clic, reprise après coupure).
 */
export function recordDownloadRequest(readerId: string, input: Input) {
  const d = db();
  return d.transaction(() => {
    const existing = d.prepare("SELECT id, reader_id AS readerId, edition_id AS editionId, work_id AS workId FROM download_requests WHERE idempotency_key = ?").get(input.idempotencyKey) as
      | { id: string; readerId: string; editionId: string; workId: string }
      | undefined;
    if (existing) {
      if (existing.readerId !== readerId || existing.workId !== input.workId) throw new ApiError(409, "conflit", "Cette demande ne peut pas être rejouée.");
      return { id: existing.id, editionId: existing.editionId, replay: true };
    }
    const work = d.prepare("SELECT status FROM works WHERE id = ?").get(input.workId) as { status: string } | undefined;
    if (!work || work.status !== "publie") throw new ApiError(404, "ouvrage_introuvable", "Cet ouvrage n'est pas disponible.");
    const edition = getPublishedEdition(input.workId);
    if (!edition) throw new ApiError(409, "edition_indisponible", "Le fichier de cet ouvrage n'est pas encore disponible au téléchargement.");
    const id = newId();
    d.prepare(
      `INSERT INTO download_requests (id, idempotency_key, reader_id, work_id, edition_id, last_name, first_name, church, whatsapp, email, motivation, discovery, consent_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.idempotencyKey, readerId, input.workId, edition.id, input.lastName, input.firstName, input.church, input.whatsapp, input.email, input.motivation, input.discovery, CONSENT_VERSION);
    return { id, editionId: edition.id, replay: false };
  })();
}

export function readerOwnsDownload(readerId: string, requestId: string, editionId: string): boolean {
  return Boolean(
    db().prepare("SELECT 1 FROM download_requests WHERE id = ? AND reader_id = ? AND edition_id = ?").get(requestId, readerId, editionId),
  );
}

export interface DownloadRow {
  id: string; workId: string; title: string; editionLabel: string; lastName: string; firstName: string; church: string;
  whatsapp: string; email: string | null; motivation: string; discovery: string; consentVersion: string; createdAt: string;
}

/** Pagination par curseur (created_at, id) — aucune troncature silencieuse. */
export function listDownloads(limit: number, cursor?: { createdAt: string; id: string }): DownloadRow[] {
  const base = `SELECT r.id, r.work_id AS workId, w.title, e.label AS editionLabel, r.last_name AS lastName, r.first_name AS firstName, r.church,
    r.whatsapp, r.email, r.motivation, r.discovery, r.consent_version AS consentVersion, r.created_at AS createdAt
    FROM download_requests r JOIN works w ON w.id = r.work_id JOIN editions e ON e.id = r.edition_id`;
  if (cursor) {
    return db().prepare(`${base} WHERE (r.created_at, r.id) < (?, ?) ORDER BY r.created_at DESC, r.id DESC LIMIT ?`).all(cursor.createdAt, cursor.id, limit) as DownloadRow[];
  }
  return db().prepare(`${base} ORDER BY r.created_at DESC, r.id DESC LIMIT ?`).all(limit) as DownloadRow[];
}
