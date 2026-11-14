import "server-only";
import { db } from "../db";
import { env } from "../env";
import { newId } from "../ids";
import { generationChain } from "../llm/registry";
import { generateWithFallback } from "../llm/fallback";
import { LlmError } from "../llm/errors";
import { acquireLlmSlot } from "../llm/budget";
import { retrieve, type Passage } from "./retrieval";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import { validateAnswer } from "./validate";
import { formatTimecode, type StudyAnswer, type StudyEvent, type StudyExchange, type StudySource } from "@/lib/domain/study-types";

export interface StudyInput {
  question: string;
  threadId: string;
  readerId: string;
  context: "textes" | "predications";
  workId: string | null;
  requestId: string;
  signal: AbortSignal;
  emit: (e: StudyEvent) => void;
}

export function toSource(p: Passage, index: number): StudySource {
  const ref = `S${index + 1}`;
  if (p.sourceType === "video") {
    const t = p.startSec != null ? Math.floor(p.startSec) : null;
    return {
      ref, passageId: p.id, type: "video", title: p.title,
      location: t != null ? `segment à ${formatTimecode(t)}` : "transcription non horodatée",
      href: `/videos/${encodeURIComponent(p.videoId ?? "")}${t != null ? `?t=${t}` : ""}`,
      text: p.text,
    };
  }
  if (p.sourceType === "article") {
    return { ref, passageId: p.id, type: "article", title: p.title, location: "écrit", href: `/ecrits`, text: p.text };
  }
  return {
    ref, passageId: p.id, type: "edition", title: p.title,
    location: `${p.editionLabel ?? "édition"}, page ${p.pageStart} du fichier`,
    href: `/lecture/${encodeURIComponent(p.workId ?? "")}?page=${p.pageStart}&edition=${encodeURIComponent(p.editionId ?? "")}`,
    text: p.text,
  };
}

function threadHistory(readerId: string, threadId: string) {
  const rows = db()
    .prepare(
      `SELECT question_utilisateur AS question, reponse_gemini AS answer FROM etude_conversations
       WHERE session_id = ? AND thread_id = ? AND statut = 'reponse' ORDER BY date_heure DESC LIMIT 3`,
    )
    .all(readerId, threadId) as { question: string; answer: string | null }[];
  return rows.reverse().map((r) => {
    let resume = "";
    try {
      const a = JSON.parse(r.answer ?? "{}") as StudyAnswer;
      resume = (a.sections?.fondement ?? "").replace(/\[S\d+\]/g, "").slice(0, 400);
    } catch {
      /* historique illisible ignoré */
    }
    return { question: r.question, resume };
  });
}

/** Journalisation tolérante : une erreur de journal ne fait jamais échouer la réponse. */
function safeLog(fn: () => void) {
  try {
    fn();
  } catch {
    console.error("[etude] échec d'écriture du journal");
  }
}

export async function runStudy(input: StudyInput): Promise<void> {
  const started = Date.now();
  const exchangeId = newId();
  const { emit } = input;
  safeLog(() =>
    db().prepare(
      `INSERT INTO etude_conversations (id, session_id, thread_id, question_utilisateur, statut, contexte, work_id, request_id)
       VALUES (?, ?, ?, ?, 'en_cours', ?, ?, ?)`,
    ).run(exchangeId, input.readerId, input.threadId, input.question, input.context, input.workId, input.requestId),
  );

  const finish = (statut: string, answer: StudyAnswer | null, sources: StudySource[], provider?: string, model?: string) => {
    safeLog(() =>
      db().prepare(
        `UPDATE etude_conversations SET statut = ?, reponse_gemini = ?, sources_citees = ?, temps_reponse = ?, fournisseur = ?, modele = ? WHERE id = ?`,
      ).run(statut, answer ? JSON.stringify(answer) : null, JSON.stringify(sources), Date.now() - started, provider ?? null, model ?? null, exchangeId),
    );
  };

  try {
    emit({ event: "status", data: { step: "recherche", message: "Recherche dans les sources validées…" } });
    const { passages } = await retrieve(input.question, { context: input.context, workId: input.workId }, input.signal);
    const sources = passages.map(toSource);

    if (!sources.length) {
      const answer: StudyAnswer = {
        kind: "insuffisant",
        notice:
          "Aucun passage du corpus publié ne correspond à cette question. Plutôt que d'improviser une réponse, nous vous proposons de reformuler, ou d'interroger le ministère en consultation privée.",
      };
      emit({ event: "sources", data: { sources } });
      emit({ event: "answer", data: { exchangeId, answer } });
      finish("insuffisant", answer, sources);
      return;
    }
    emit({ event: "sources", data: { sources } });

    const chain = generationChain();
    if (!chain.length) {
      const answer: StudyAnswer = {
        kind: "documentaire",
        notice: "La synthèse automatique n'est pas activée : voici les passages du corpus les plus proches de votre question, à lire dans leur contexte.",
      };
      emit({ event: "answer", data: { exchangeId, answer } });
      finish("documentaire", answer, sources);
      return;
    }

    const slot = acquireLlmSlot("question");
    if (!slot.ok) {
      const retryAfterSec = Math.ceil(slot.retryAfterMs / 1000);
      const answer: StudyAnswer = {
        kind: "indisponible",
        retryAfterSec,
        notice: `La synthèse est momentanément saturée. Les passages retrouvés restent consultables ; vous pourrez relancer la synthèse dans environ ${retryAfterSec} s.`,
      };
      emit({ event: "answer", data: { exchangeId, answer } });
      finish("indisponible", answer, sources);
      return;
    }

    emit({ event: "status", data: { step: "generation", message: "Rédaction d'une synthèse à partir des passages…" } });
    const sourceMap = new Map(sources.map((s) => [s.ref, s.text]));
    const user = buildUserPrompt(
      input.question,
      sources.map((s) => ({ ref: s.ref, title: s.title, location: s.location, text: s.text })),
      threadHistory(input.readerId, input.threadId),
    );
    const timeout = AbortSignal.timeout(env().LLM_TIMEOUT_MS);
    const signal = AbortSignal.any([input.signal, timeout]);
    const result = await generateWithFallback(chain, { system: SYSTEM_PROMPT, user, json: true, signal }, { maxCalls: 4, maxWaitMs: 8000 });

    emit({ event: "status", data: { step: "validation", message: "Vérification des citations…" } });
    let validated;
    try {
      validated = validateAnswer(result.text, sourceMap);
    } catch {
      const answer: StudyAnswer = {
        kind: "indisponible",
        notice: "La synthèse produite n'a pas pu être vérifiée ; elle n'est donc pas affichée. Les passages retrouvés restent consultables.",
      };
      emit({ event: "answer", data: { exchangeId, answer } });
      finish("erreur", answer, sources, result.provider, result.model);
      return;
    }
    const answer: StudyAnswer = {
      kind: validated.suffisance === "insuffisante" ? "insuffisant" : "reponse",
      suffisance: validated.suffisance,
      sections: validated.sections,
      citations: validated.citations,
      relances: validated.relances,
      limites: validated.limites,
      provider: result.provider,
      model: result.model,
    };
    emit({ event: "answer", data: { exchangeId, answer } });
    finish(answer.kind === "reponse" ? "reponse" : "insuffisant", answer, sources, result.provider, result.model);
  } catch (e) {
    if (e instanceof LlmError && e.kind === "annule") {
      finish("annule", null, []);
      return;
    }
    const kind = e instanceof LlmError ? e.kind : "erreur";
    const messages: Record<string, string> = {
      cle_invalide: "La synthèse est indisponible (configuration du fournisseur à vérifier par l'administrateur).",
      modele_indisponible: "La synthèse est indisponible (modèle non accessible).",
      quota_journalier: "Le quota quotidien de synthèse est atteint. Les passages restent consultables.",
      surcharge: "Le service de synthèse est surchargé. Réessayez dans quelques instants.",
      delai_depasse: "La synthèse a pris trop de temps et a été interrompue.",
      reseau: "Le service de synthèse est injoignable pour le moment.",
    };
    const answer: StudyAnswer = {
      kind: "indisponible",
      notice: messages[kind] ?? "La synthèse est temporairement indisponible.",
      retryAfterSec: e instanceof LlmError && e.retryAfterMs ? Math.ceil(e.retryAfterMs / 1000) : undefined,
    };
    emit({ event: "answer", data: { exchangeId, answer } });
    finish(kind === "erreur" ? "erreur" : "indisponible", answer, []);
  } finally {
    emit({ event: "done", data: { exchangeId, durationMs: Date.now() - started } });
  }
}

export function listThread(readerId: string, threadId: string, limit = 50): StudyExchange[] {
  const rows = db()
    .prepare(
      `SELECT id, question_utilisateur AS question, date_heure AS createdAt, contexte AS context, work_id AS workId,
              sources_citees AS sources, reponse_gemini AS answer, statut AS status
       FROM etude_conversations WHERE session_id = ? AND thread_id = ? ORDER BY date_heure ASC LIMIT ?`,
    )
    .all(readerId, threadId, limit) as { id: string; question: string; createdAt: string; context: "textes" | "predications"; workId: string | null; sources: string | null; answer: string | null; status: string }[];
  return rows.map((r) => ({
    ...r,
    sources: r.sources ? (JSON.parse(r.sources) as StudySource[]) : [],
    answer: r.answer ? (JSON.parse(r.answer) as StudyAnswer) : null,
  }));
}

export function listThreads(readerId: string) {
  return db()
    .prepare(
      `SELECT thread_id AS threadId, MIN(date_heure) AS startedAt, MAX(date_heure) AS lastAt, COUNT(*) AS count,
              (SELECT question_utilisateur FROM etude_conversations e2 WHERE e2.session_id = e.session_id AND e2.thread_id = e.thread_id ORDER BY date_heure LIMIT 1) AS firstQuestion
       FROM etude_conversations e WHERE session_id = ? GROUP BY thread_id ORDER BY lastAt DESC LIMIT 30`,
    )
    .all(readerId) as { threadId: string; startedAt: string; lastAt: string; count: number; firstQuestion: string }[];
}

/** Suppression par le lecteur de son propre historique (fil ou totalité). */
export function deleteThreads(readerId: string, threadId?: string): number {
  const res = threadId
    ? db().prepare("DELETE FROM etude_conversations WHERE session_id = ? AND thread_id = ?").run(readerId, threadId)
    : db().prepare("DELETE FROM etude_conversations WHERE session_id = ?").run(readerId);
  return res.changes;
}

