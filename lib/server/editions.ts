import "server-only";
import { db } from "./db";
import { newId, nowIso, sha256 } from "./ids";
import { putObject, getObject } from "./storage";
import { extractPdfPages, isPdf } from "./pdf-extract";
import { chunkPage, CHUNKER_VERSION } from "./chunker";
import { enqueue, heartbeat, type Job } from "./jobs";
import { getEdition } from "./catalog";
import { embeddingConfigured, embeddingSpace } from "./embeddings";

export const MAX_PDF_BYTES = 80 * 1024 * 1024;

export interface ImportResult {
  editionId: string;
  duplicate: boolean;
  jobId: string | null;
}

/**
 * Crée une édition BROUILLON immuable à partir des octets réels d'un PDF.
 * - Le SHA-256 identifie l'édition : un fichier identique n'est jamais réimporté.
 * - Rien n'est publié ni remplacé ici : la publication est une action distincte.
 */
export async function importEditionFile(input: {
  workId: string;
  label: string;
  data: Uint8Array;
  sourceKind: "drive" | "televersement" | "depot";
  driveFileId?: string | null;
  driveRevisionId?: string | null;
}): Promise<ImportResult> {
  if (input.data.byteLength === 0) throw new Error("Fichier vide.");
  if (input.data.byteLength > MAX_PDF_BYTES) throw new Error("Fichier trop volumineux.");
  if (!isPdf(input.data)) throw new Error("Le fichier n'est pas un PDF (signature %PDF- absente).");
  const work = db().prepare("SELECT id FROM works WHERE id = ?").get(input.workId);
  if (!work) throw new Error("Œuvre inconnue.");

  const digest = sha256(input.data);
  const existing = db().prepare("SELECT id, work_id AS workId FROM editions WHERE sha256 = ?").get(digest) as
    | { id: string; workId: string }
    | undefined;
  if (existing) {
    if (existing.workId !== input.workId) throw new Error("Ce fichier est déjà enregistré pour une autre œuvre.");
    return { editionId: existing.id, duplicate: true, jobId: null };
  }

  const id = newId();
  const storageKey = `editions/${input.workId}/${digest}.pdf`;
  await putObject(storageKey, input.data).catch((e: NodeJS.ErrnoException) => {
    if (e.code !== "EEXIST") throw e;
  });
  db().prepare(
    `INSERT INTO editions (id, work_id, label, sha256, storage_key, byte_size, page_count, source_kind, drive_file_id, drive_revision_id, status)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'brouillon')`,
  ).run(id, input.workId, input.label, digest, storageKey, input.data.byteLength, input.sourceKind, input.driveFileId ?? null, input.driveRevisionId ?? null);
  const job = enqueue("edition.extract", { editionId: id }, `edition.extract:${id}`);
  return { editionId: id, duplicate: false, jobId: job.id };
}

/** Tâche : extraction serveur + passages. Idempotente (efface et refait pour une édition brouillon). */
export async function runExtractJob(job: Job, owner: string) {
  const { editionId } = JSON.parse(job.payload) as { editionId: string };
  const edition = getEdition(editionId);
  if (!edition) throw new Error("Édition introuvable.");
  if (edition.status !== "brouillon") return; // une édition publiée n'est jamais réextraite
  const d = db();
  d.prepare("UPDATE editions SET extraction_status = 'en_cours' WHERE id = ?").run(editionId);
  const data = await getObject(edition.storageKey);
  if (sha256(data) !== edition.sha256) throw new Error("Empreinte SHA-256 du fichier stocké différente de l'édition.");

  const { pageCount, pages } = await extractPdfPages(data, (n, total) => {
    if (n % 25 === 0 || n === total) heartbeat(job, owner, { done: n, total });
  });
  const empty = pages.filter((p) => p.text.length < 20).length;

  d.transaction(() => {
    d.prepare("DELETE FROM passages WHERE edition_id = ?").run(editionId);
    d.prepare("DELETE FROM edition_pages WHERE edition_id = ?").run(editionId);
    const insertPage = d.prepare("INSERT INTO edition_pages (edition_id, page_number, text, char_count) VALUES (?, ?, ?, ?)");
    const insertPassage = d.prepare(
      `INSERT INTO passages (id, source_type, work_id, edition_id, page_start, page_end, pillar, text, text_sha256, chunker_version)
       VALUES (?, 'edition', ?, ?, ?, ?, (SELECT pillar FROM works WHERE id = ?), ?, ?, ?)`,
    );
    for (const p of pages) {
      insertPage.run(editionId, p.pageNumber, p.text, p.text.length);
      for (const c of chunkPage(p.text)) {
        insertPassage.run(newId(), edition.workId, editionId, p.pageNumber, p.pageNumber, edition.workId, c.text, sha256(c.text), CHUNKER_VERSION);
      }
    }
    d.prepare(
      `UPDATE editions SET page_count = ?, pages_without_text = ?, extraction_status = ? WHERE id = ?`,
    ).run(pageCount, empty, empty === 0 ? "terminee" : empty === pageCount ? "echec" : "partielle", editionId);
  })();

  if (embeddingConfigured()) {
    enqueue("passages.embed", { space: embeddingSpace() }, `passages.embed:${embeddingSpace()}`);
  }
}

export class PublishError extends Error {}

/**
 * Publication atomique : l'ancienne édition publiée devient « remplacée » (ses pages et
 * passages restent consultables pour les anciennes citations), la nouvelle devient publiée.
 */
export function publishEdition(editionId: string, actor: string) {
  const d = db();
  d.transaction(() => {
    const e = getEdition(editionId);
    if (!e) throw new PublishError("Édition introuvable.");
    if (e.status === "publiee") return;
    if (e.status !== "brouillon") throw new PublishError("Seule une édition brouillon peut être publiée.");
    if (e.extractionStatus !== "terminee" && e.extractionStatus !== "partielle") {
      throw new PublishError("Extraction non terminée : publication refusée.");
    }
    const passages = d.prepare("SELECT COUNT(*) AS n FROM passages WHERE edition_id = ?").get(editionId) as { n: number };
    if (passages.n === 0) throw new PublishError("Aucun passage extrait : publication refusée (OCR nécessaire ?).");
    const work = d.prepare("SELECT status, pillar FROM works WHERE id = ?").get(e.workId) as { status: string; pillar: string | null };
    if (!work.pillar) throw new PublishError("L'œuvre n'a pas de pilier validé : classez-la avant publication.");
    d.prepare("UPDATE editions SET status = 'remplacee' WHERE work_id = ? AND status = 'publiee'").run(e.workId);
    d.prepare("UPDATE editions SET status = 'publiee', published_at = ? WHERE id = ?").run(nowIso(), editionId);
    d.prepare("UPDATE passages SET pillar = ? WHERE work_id = ?").run(work.pillar, e.workId);
    d.prepare("INSERT INTO admin_audit (id, actor, action, target) VALUES (?, ?, 'edition.publier', ?)").run(newId(), actor, editionId);
  })();
}

/** Classification validée par l'administrateur (jamais automatique par mots-clés). */
export function classifyWork(workId: string, pillar: string, theme: string | null, actor: string) {
  const d = db();
  d.transaction(() => {
    const res = d.prepare("UPDATE works SET pillar = ?, theme = ?, updated_at = ? WHERE id = ?").run(pillar, theme, nowIso(), workId);
    if (res.changes === 0) throw new PublishError("Œuvre introuvable.");
    d.prepare("UPDATE passages SET pillar = ? WHERE work_id = ?").run(pillar, workId);
    d.prepare("INSERT INTO admin_audit (id, actor, action, target, detail) VALUES (?, ?, 'oeuvre.classer', ?, ?)").run(newId(), actor, workId, JSON.stringify({ pillar, theme }));
  })();
}

/** Rend une œuvre « à classer » visible dans la bibliothèque (nécessite pilier + édition publiée). */
export function setWorkStatus(workId: string, status: "publie" | "a_classer" | "retire", actor: string) {
  const d = db();
  d.transaction(() => {
    const w = d.prepare("SELECT pillar FROM works WHERE id = ?").get(workId) as { pillar: string | null } | undefined;
    if (!w) throw new PublishError("Œuvre introuvable.");
    if (status === "publie" && !w.pillar) throw new PublishError("Pilier requis avant publication.");
    d.prepare("UPDATE works SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), workId);
    d.prepare("INSERT INTO admin_audit (id, actor, action, target, detail) VALUES (?, ?, 'oeuvre.statut', ?, ?)").run(newId(), actor, workId, JSON.stringify({ status }));
  })();
}
