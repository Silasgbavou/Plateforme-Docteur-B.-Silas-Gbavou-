/** Contrat partagé client/serveur du moteur d'étude (événements SSE). */
export interface StudySource {
  ref: string;
  passageId: string;
  type: "edition" | "video" | "article";
  title: string;
  location: string;
  href: string;
  text: string;
}

export type StudyAnswerKind = "reponse" | "documentaire" | "insuffisant" | "indisponible";

export interface StudyAnswer {
  kind: StudyAnswerKind;
  suffisance?: "suffisante" | "partielle" | "insuffisante";
  sections?: { fondement: string; ecritures: string; ancrage: string; application: string };
  citations?: { source: string; extrait: string }[];
  relances?: { question: string; sources: string[] }[];
  limites?: string;
  notice?: string;
  retryAfterSec?: number;
  provider?: string;
  model?: string;
}

export interface StudyExchange {
  id: string;
  question: string;
  createdAt: string;
  context: "textes" | "predications";
  workId: string | null;
  sources: StudySource[];
  answer: StudyAnswer | null;
  status: string;
}

export type StudyEvent =
  | { event: "status"; data: { step: "recherche" | "generation" | "validation"; message: string } }
  | { event: "sources"; data: { sources: StudySource[] } }
  | { event: "answer"; data: { exchangeId: string; answer: StudyAnswer } }
  | { event: "error"; data: { code: string; message: string; retryable: boolean; retryAfter?: number } }
  | { event: "done"; data: { exchangeId: string; durationMs: number } };

export function formatTimecode(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
