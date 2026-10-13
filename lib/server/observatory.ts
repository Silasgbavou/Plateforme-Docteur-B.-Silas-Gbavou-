import "server-only";
import { db } from "./db";
import type { StudyAnswer, StudySource } from "@/lib/domain/study-types";

export interface ObservatoryFilters {
  from?: string; // AAAA-MM-JJ (UTC)
  to?: string;
  q?: string;
  statut?: string;
  cursor?: { createdAt: string; id: string };
}

export interface ObservatoryRow {
  id: string; sessionId: string; createdAt: string; question: string; answer: StudyAnswer | null; sources: StudySource[];
  durationMs: number | null; status: string; provider: string | null; model: string | null; context: string; workId: string | null;
}

function where(f: ObservatoryFilters) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (f.from) { clauses.push("date_heure >= ?"); params.push(`${f.from}T00:00:00.000Z`); }
  if (f.to) { clauses.push("date_heure <= ?"); params.push(`${f.to}T23:59:59.999Z`); }
  if (f.q) {
    clauses.push("(question_utilisateur LIKE ? ESCAPE '\\' OR reponse_gemini LIKE ? ESCAPE '\\')");
    const like = `%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    params.push(like, like);
  }
  if (f.statut) { clauses.push("statut = ?"); params.push(f.statut); }
  return { clauses, params };
}

export function listObservatory(f: ObservatoryFilters, limit = 25): ObservatoryRow[] {
  const { clauses, params } = where(f);
  if (f.cursor) { clauses.push("(date_heure, id) < (?, ?)"); params.push(f.cursor.createdAt, f.cursor.id); }
  const rows = db().prepare(
    `SELECT id, session_id AS sessionId, date_heure AS createdAt, question_utilisateur AS question, reponse_gemini AS answer, sources_citees AS sources,
       temps_reponse AS durationMs, statut AS status, fournisseur AS provider, modele AS model, contexte AS context, work_id AS workId
     FROM etude_conversations ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY date_heure DESC, id DESC LIMIT ?`,
  ).all(...params, limit) as (Omit<ObservatoryRow, "answer" | "sources"> & { answer: string | null; sources: string | null })[];
  return rows.map((r) => ({ ...r, answer: r.answer ? JSON.parse(r.answer) : null, sources: r.sources ? JSON.parse(r.sources) : [] }));
}

/**
 * Statistiques agrégées et explicables :
 * - volumes par semaine ISO et par mois (UTC) ;
 * - « thèmes » = piliers/thèmes des OUVRAGES effectivement cités dans les sources des réponses
 *   (aucune inférence sur les personnes, aucun classement lexical opaque).
 */
export function observatoryStats() {
  const d = db();
  const weeks = d.prepare(`SELECT strftime('%Y-S%W', date_heure) AS period, COUNT(*) AS n FROM etude_conversations GROUP BY period ORDER BY period DESC LIMIT 8`).all() as { period: string; n: number }[];
  const months = d.prepare(`SELECT strftime('%Y-%m', date_heure) AS period, COUNT(*) AS n FROM etude_conversations GROUP BY period ORDER BY period DESC LIMIT 6`).all() as { period: string; n: number }[];
  const byStatus = d.prepare(`SELECT statut AS status, COUNT(*) AS n FROM etude_conversations WHERE date_heure >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days') GROUP BY statut ORDER BY n DESC`).all() as { status: string; n: number }[];
  const themes = d.prepare(
    `SELECT w.pillar AS pillar, COALESCE(w.theme, '—') AS theme, COUNT(DISTINCT e.id) AS n
     FROM etude_conversations e, json_each(COALESCE(e.sources_citees, '[]')) s
     JOIN passages p ON p.id = json_extract(s.value, '$.passageId')
     JOIN works w ON w.id = p.work_id
     WHERE e.date_heure >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days')
     GROUP BY w.pillar, w.theme ORDER BY n DESC LIMIT 12`,
  ).all() as { pillar: string | null; theme: string; n: number }[];
  return { weeks, months, byStatus, themes };
}

export function deleteObservatoryEntry(id: string) {
  return db().prepare("DELETE FROM etude_conversations WHERE id = ?").run(id).changes;
}
