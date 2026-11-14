import { LlmError } from "./errors";
import type { GenerateRequest, ProviderCall } from "./providers";

export interface FallbackOptions {
  /** Nombre maximal d'appels réels au total (toutes tentatives confondues). */
  maxCalls: number;
  /** Attente maximale acceptée pour respecter un Retry-After avant de passer au modèle suivant. */
  maxWaitMs: number;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  random?: () => number;
  onAttempt?: (info: { provider: string; model: string; attempt: number }) => void;
}

export interface FallbackResult {
  text: string;
  provider: string;
  model: string;
  calls: number;
}

export interface FallbackFailure {
  error: LlmError;
  calls: number;
  trail: { provider: string; model: string; kind: string }[];
}

export const defaultSleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new LlmError("annule", "Requête annulée."));
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new LlmError("annule", "Requête annulée."));
    }, { once: true });
  });

/**
 * Génération avec repli borné :
 * - surcharge (429/503) : respect de Retry-After (si ≤ maxWaitMs) avec gigue, une nouvelle tentative
 *   sur le même modèle, puis modèle suivant après une pause — jamais de tempête de repli instantané ;
 * - modèle indisponible : modèle suivant ;
 * - clé invalide / quota journalier : arrêt pour ce fournisseur (inutile d'insister) ;
 * - annulation / délai : arrêt immédiat.
 */
export async function generateWithFallback(
  chain: ProviderCall[],
  req: GenerateRequest,
  opts: FallbackOptions,
): Promise<FallbackResult> {
  const sleep = opts.sleep ?? defaultSleep;
  const random = opts.random ?? Math.random;
  const trail: FallbackFailure["trail"] = [];
  let calls = 0;
  let last: LlmError = new LlmError("non_configure", "Aucun modèle de génération configuré.");
  const deadProviders = new Set<string>();

  for (const p of chain) {
    if (deadProviders.has(p.provider)) continue;
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (calls >= opts.maxCalls) throw Object.assign(last, { trail, calls });
      calls++;
      opts.onAttempt?.({ provider: p.provider, model: p.model, attempt });
      try {
        const text = await p.generate(req);
        return { text, provider: p.provider, model: p.model, calls };
      } catch (e) {
        const err = e instanceof LlmError ? e : new LlmError("reseau", "Erreur inattendue du fournisseur.");
        last = err;
        trail.push({ provider: p.provider, model: p.model, kind: err.kind });
        if (err.kind === "annule" || err.kind === "delai_depasse") throw Object.assign(err, { trail, calls });
        if (err.kind === "cle_invalide" || err.kind === "quota_journalier") {
          deadProviders.add(p.provider);
          break;
        }
        if (err.kind === "modele_indisponible" || err.kind === "reponse_invalide") break;
        if (err.kind === "surcharge" || err.kind === "reseau") {
          const base = err.retryAfterMs ?? 1000 * attempt;
          const wait = Math.round(base * (1 + random() * 0.3));
          if (attempt === 1 && wait <= opts.maxWaitMs) {
            await sleep(wait, req.signal);
            continue; // même modèle, une fois
          }
          // Pause courte avant le modèle suivant pour ne pas amplifier la surcharge.
          await sleep(Math.min(opts.maxWaitMs, Math.round(800 + random() * 700)), req.signal);
          break;
        }
        break;
      }
    }
  }
  throw Object.assign(last, { trail, calls });
}
