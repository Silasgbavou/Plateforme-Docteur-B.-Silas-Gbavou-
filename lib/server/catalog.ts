import "server-only";
import { db } from "./db";
import type { PillarId } from "@/lib/domain/pillars";
import { AUTHOR, WORK_SEEDS } from "@/lib/domain/catalog-seed";

export interface Work {
  id: string;
  title: string;
  author: string;
  pillar: PillarId | null;
  theme: string | null;
  status: "publie" | "a_classer" | "retire";
  pageCountCatalog: number | null;
  sortOrder: number;
  coverKey: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
}

export interface Edition {
  id: string;
  workId: string;
  label: string;
  sha256: string;
  storageKey: string;
  byteSize: number;
  pageCount: number;
  printedPageOffset: number | null;
  sourceKind: "drive" | "televersement" | "depot";
  driveFileId: string | null;
  status: "brouillon" | "publiee" | "remplacee" | "retiree";
  extractionStatus: "en_attente" | "en_cours" | "terminee" | "partielle" | "echec";
  pagesWithoutText: number;
  createdAt: string;
  publishedAt: string | null;
}

export interface WorkWithEdition extends Work {
  edition: Edition | null;
}

const WORK_COLS = `id, title, author, pillar, theme, status, page_count_catalog AS pageCountCatalog, sort_order AS sortOrder,
  cover_key AS coverKey, cover_width AS coverWidth, cover_height AS coverHeight`;
const EDITION_COLS = `id, work_id AS workId, label, sha256, storage_key AS storageKey, byte_size AS byteSize,
  page_count AS pageCount, printed_page_offset AS printedPageOffset, source_kind AS sourceKind,
  drive_file_id AS driveFileId, status, extraction_status AS extractionStatus,
  pages_without_text AS pagesWithoutText, created_at AS createdAt, published_at AS publishedAt`;

/** Insère le catalogue initial si absent (idempotent, ne modifie jamais une œuvre existante). */
export function seedCatalog() {
  const d = db();
  const insertWork = d.prepare(
    `INSERT OR IGNORE INTO works (id, title, author, pillar, theme, status, page_count_catalog, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertDrive = d.prepare(
    `INSERT OR IGNORE INTO drive_sources (file_id, work_id, name, size_bytes, modified_time) VALUES (?, ?, ?, ?, ?)`,
  );
  d.transaction(() => {
    WORK_SEEDS.forEach((w, i) => {
      insertWork.run(w.id, w.title, AUTHOR, w.pillar, w.theme, w.status, w.pageCountCatalog, i);
      insertDrive.run(w.drive.fileId, w.id, w.drive.name, w.drive.sizeBytes, w.drive.modifiedTime);
    });
  })();
}

function ensureSeeded() {
  const row = db().prepare("SELECT COUNT(*) AS n FROM works").get() as { n: number };
  if (row.n === 0) seedCatalog();
}

export function listPublishedWorks(): WorkWithEdition[] {
  ensureSeeded();
  const works = db().prepare(`SELECT ${WORK_COLS} FROM works WHERE status = 'publie' ORDER BY sort_order, title`).all() as Work[];
  const editions = db().prepare(`SELECT ${EDITION_COLS} FROM editions WHERE status = 'publiee'`).all() as Edition[];
  const byWork = new Map(editions.map((e) => [e.workId, e]));
  return works.map((w) => ({ ...w, edition: byWork.get(w.id) ?? null }));
}

export function listAllWorks(): WorkWithEdition[] {
  ensureSeeded();
  const works = db().prepare(`SELECT ${WORK_COLS} FROM works ORDER BY sort_order, title`).all() as Work[];
  const editions = db().prepare(`SELECT ${EDITION_COLS} FROM editions WHERE status = 'publiee'`).all() as Edition[];
  const byWork = new Map(editions.map((e) => [e.workId, e]));
  return works.map((w) => ({ ...w, edition: byWork.get(w.id) ?? null }));
}

export function getWork(id: string): WorkWithEdition | null {
  ensureSeeded();
  const work = db().prepare(`SELECT ${WORK_COLS} FROM works WHERE id = ?`).get(id) as Work | undefined;
  if (!work) return null;
  return { ...work, edition: getPublishedEdition(id) };
}

export function getPublishedEdition(workId: string): Edition | null {
  return (db().prepare(`SELECT ${EDITION_COLS} FROM editions WHERE work_id = ? AND status = 'publiee'`).get(workId) as Edition | undefined) ?? null;
}

export function getEdition(id: string): Edition | null {
  return (db().prepare(`SELECT ${EDITION_COLS} FROM editions WHERE id = ?`).get(id) as Edition | undefined) ?? null;
}

export function listEditions(workId: string): Edition[] {
  return db().prepare(`SELECT ${EDITION_COLS} FROM editions WHERE work_id = ? ORDER BY created_at DESC`).all(workId) as Edition[];
}

export function getPageText(editionId: string, page: number): string | null {
  const row = db().prepare("SELECT text FROM edition_pages WHERE edition_id = ? AND page_number = ?").get(editionId, page) as
    | { text: string }
    | undefined;
  return row?.text ?? null;
}

export function listDriveSources() {
  return db().prepare(
    `SELECT d.file_id AS fileId, d.work_id AS workId, d.name, d.size_bytes AS sizeBytes, d.modified_time AS modifiedTime,
            (SELECT COUNT(*) FROM editions e WHERE e.drive_file_id = d.file_id) AS editionCount, d.last_status AS lastStatus
     FROM drive_sources d ORDER BY d.work_id`,
  ).all() as { fileId: string; workId: string; name: string; sizeBytes: number; modifiedTime: string; editionCount: number; lastStatus: string | null }[];
}
