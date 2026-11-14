import { classifyHttpError, LlmError } from "./errors";

export interface GenerateRequest {
  system: string;
  user: string;
  json: boolean;
  signal: AbortSignal;
  maxOutputTokens?: number;
}

export type FetchLike = typeof fetch;

export interface ProviderCall {
  provider: "gemini" | "openai";
  model: string;
  generate(req: GenerateRequest): Promise<string>;
}

export const GEMINI_DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta";
export const OPENAI_DEFAULT_BASE = "https://api.openai.com/v1";

async function doFetch(fetchImpl: FetchLike, url: string, init: RequestInit, signal: AbortSignal) {
  try {
    return await fetchImpl(url, { ...init, signal });
  } catch (e) {
    if (signal.aborted) {
      const reason = signal.reason as Error | undefined;
      if (reason?.name === "TimeoutError") throw new LlmError("delai_depasse", "Délai de génération dépassé.");
      throw new LlmError("annule", "Requête annulée.");
    }
    throw new LlmError("reseau", `Erreur réseau : ${(e as Error).name}`);
  }
}

export function geminiProvider(apiKey: string, model: string, fetchImpl: FetchLike = fetch, base = GEMINI_DEFAULT_BASE): ProviderCall {
  return {
    provider: "gemini",
    model,
    async generate(req) {
      const res = await doFetch(
        fetchImpl,
        `${base}/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          // Clé transmise en en-tête (jamais dans l'URL, donc jamais dans les journaux d'URL).
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: req.system }] },
            contents: [{ role: "user", parts: [{ text: req.user }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: req.maxOutputTokens ?? 4096,
              ...(req.json ? { responseMimeType: "application/json" } : {}),
            },
          }),
        },
        req.signal,
      );
      const text = await res.text();
      if (!res.ok) throw classifyHttpError(res.status, text, res.headers.get("retry-after"));
      try {
        const data = JSON.parse(text) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] };
        const out = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        if (!out) throw new Error("vide");
        return out;
      } catch {
        throw new LlmError("reponse_invalide", "Réponse du fournisseur illisible ou vide.");
      }
    },
  };
}

export function openaiProvider(apiKey: string, model: string, fetchImpl: FetchLike = fetch, base = OPENAI_DEFAULT_BASE): ProviderCall {
  return {
    provider: "openai",
    model,
    async generate(req) {
      const res = await doFetch(
        fetchImpl,
        `${base}/chat/completions`,
        {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: req.system },
              { role: "user", content: req.user },
            ],
            ...(req.json ? { response_format: { type: "json_object" } } : {}),
            max_completion_tokens: req.maxOutputTokens ?? 4096,
          }),
        },
        req.signal,
      );
      const text = await res.text();
      if (!res.ok) throw classifyHttpError(res.status, text, res.headers.get("retry-after"));
      try {
        const data = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
        const out = data.choices?.[0]?.message?.content ?? "";
        if (!out) throw new Error("vide");
        return out;
      } catch {
        throw new LlmError("reponse_invalide", "Réponse du fournisseur illisible ou vide.");
      }
    },
  };
}
