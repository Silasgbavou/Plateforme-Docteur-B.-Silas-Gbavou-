import "server-only";
import { env } from "../env";
import { geminiProvider, openaiProvider, type ProviderCall } from "./providers";

/**
 * Registre des modèles AUTORISÉS : uniquement ceux déclarés en configuration serveur,
 * vérifiés avec `pnpm models:check`. Aucun identifiant n'est deviné dans le code.
 */
export function generationChain(): ProviderCall[] {
  const e = env();
  const gemini = e.GEMINI_API_KEY ? e.GEMINI_MODELS.map((m) => geminiProvider(e.GEMINI_API_KEY!, m, fetch, e.GEMINI_API_BASE)) : [];
  const openai = e.OPENAI_API_KEY ? e.OPENAI_MODELS.map((m) => openaiProvider(e.OPENAI_API_KEY!, m, fetch, e.OPENAI_API_BASE)) : [];
  if (e.LLM_PROVIDER === "gemini") return e.LLM_CROSS_PROVIDER_FALLBACK ? [...gemini, ...openai] : gemini;
  if (e.LLM_PROVIDER === "openai") return e.LLM_CROSS_PROVIDER_FALLBACK ? [...openai, ...gemini] : openai;
  return [];
}

export function generationStatus() {
  const e = env();
  const chain = generationChain();
  return {
    provider: e.LLM_PROVIDER,
    configured: chain.length > 0,
    models: chain.map((c) => `${c.provider}:${c.model}`),
    crossProvider: e.LLM_CROSS_PROVIDER_FALLBACK,
    keys: { gemini: Boolean(e.GEMINI_API_KEY), openai: Boolean(e.OPENAI_API_KEY) },
  };
}
