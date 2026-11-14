export type LlmErrorKind =
  | "non_configure"
  | "cle_invalide"
  | "modele_indisponible"
  | "quota_journalier"
  | "surcharge"
  | "reseau"
  | "delai_depasse"
  | "reponse_invalide"
  | "annule";

export class LlmError extends Error {
  constructor(
    public kind: LlmErrorKind,
    message: string,
    public retryAfterMs?: number,
    public status?: number,
  ) {
    super(message);
  }
}

/** Analyse Retry-After (secondes ou date HTTP). */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}

/** Classe une réponse HTTP d'un fournisseur en erreur typée. */
export function classifyHttpError(status: number, bodyText: string, retryAfter: string | null): LlmError {
  const retryAfterMs = parseRetryAfter(retryAfter);
  const body = bodyText.slice(0, 2000);
  if (status === 401 || status === 403) return new LlmError("cle_invalide", "Clé refusée par le fournisseur.", undefined, status);
  if (status === 404) return new LlmError("modele_indisponible", "Modèle inexistant ou non accessible pour ce projet.", undefined, status);
  if (status === 429) {
    if (/per\s*day|PerDay|daily/i.test(body)) {
      return new LlmError("quota_journalier", "Quota journalier atteint.", retryAfterMs, status);
    }
    return new LlmError("surcharge", "Limite de débit atteinte.", retryAfterMs, status);
  }
  if (status === 503 || status === 502 || status === 500 || status === 504) {
    return new LlmError("surcharge", "Service du fournisseur temporairement indisponible.", retryAfterMs, status);
  }
  if (status === 400 && /model/i.test(body) && /not\s*found|unsupported|deprecated/i.test(body)) {
    return new LlmError("modele_indisponible", "Modèle non pris en charge.", undefined, status);
  }
  return new LlmError("reponse_invalide", `Réponse HTTP ${status} inattendue.`, undefined, status);
}
