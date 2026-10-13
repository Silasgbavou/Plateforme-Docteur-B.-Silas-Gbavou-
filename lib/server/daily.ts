import "server-only";
import { db } from "./db";

export interface DailySelection {
  kind: "verset" | "citation";
  text: string;
  reference: string;
  day: string;
  editionId: string | null;
  pageNumber: number | null;
  workId: string | null;
}

/** Sélection du jour saisie par l'administrateur. Jamais générée. Absente => rien n'est affiché. */
export function todaysSelections(today = new Date().toISOString().slice(0, 10)): DailySelection[] {
  return db()
    .prepare(
      `SELECT d.kind, d.text, d.reference, d.day, d.edition_id AS editionId, d.page_number AS pageNumber, e.work_id AS workId
       FROM daily_selections d LEFT JOIN editions e ON e.id = d.edition_id
       WHERE d.day = ? ORDER BY d.kind`,
    )
    .all(today) as DailySelection[];
}
