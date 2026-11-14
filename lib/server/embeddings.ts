import "server-only";
import { env } from "./env";
import { classifyHttpError, LlmError } from "./llm/errors";
import { CHUNKER_VERSION } from "./chunker";

export function embeddingConfigured(): boolean {
  const e = env();
  if (e.EMBEDDING_PROVIDER === "none" || !e.EMBEDDING_MODEL) return false;
  return e.EMBEDDING_PROVIDER === "gemini" ? Boolean(e.GEMINI_API_KEY) : Boolean(e.OPENAI_API_KEY);
}

/** Espace vectoriel versionné : jamais de mélange entre modèles, dimensions ou découpages. */
export function embeddingSpace(): string {
  const e = env();
  return `${e.EMBEDDING_PROVIDER}:${e.EMBEDDING_MODEL}:${e.EMBEDDING_DIMENSIONS}:${CHUNKER_VERSION}:l2`;
}

export function normalize(v: Float32Array): Float32Array {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return v.map((x) => x / n);
}

export function toBlob(v: Float32Array): Buffer {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
}

export function fromBlob(b: Buffer): Float32Array {
  const copy = new Uint8Array(b);
  return new Float32Array(copy.buffer, 0, copy.byteLength / 4);
}

export function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

/** Calcule des embeddings normalisés. Une seule requête HTTP par lot. */
export async function embedTexts(texts: string[], kind: "document" | "requete", signal: AbortSignal): Promise<Float32Array[]> {
  const e = env();
  const dims = e.EMBEDDING_DIMENSIONS;
  let res: Response;
  try {
    if (e.EMBEDDING_PROVIDER === "gemini") {
      res = await fetch(`${e.GEMINI_API_BASE}/models/${encodeURIComponent(e.EMBEDDING_MODEL!)}:batchEmbedContents`, {
        method: "POST",
        signal,
        headers: { "content-type": "application/json", "x-goog-api-key": e.GEMINI_API_KEY! },
        body: JSON.stringify({
          requests: texts.map((t) => ({
            model: `models/${e.EMBEDDING_MODEL}`,
            content: { parts: [{ text: t }] },
            taskType: kind === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
            outputDimensionality: dims,
          })),
        }),
      });
    } else if (e.EMBEDDING_PROVIDER === "openai") {
      res = await fetch(`${e.OPENAI_API_BASE}/embeddings`, {
        method: "POST",
        signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${e.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: e.EMBEDDING_MODEL, input: texts, dimensions: dims }),
      });
    } else {
      throw new LlmError("non_configure", "Embeddings non configurés.");
    }
  } catch (err) {
    if (err instanceof LlmError) throw err;
    throw new LlmError(signal.aborted ? "annule" : "reseau", "Erreur réseau lors du calcul d'embeddings.");
  }
  const body = await res.text();
  if (!res.ok) throw classifyHttpError(res.status, body, res.headers.get("retry-after"));
  const data = JSON.parse(body) as { embeddings?: { values: number[] }[]; data?: { embedding: number[] }[] };
  const vectors = (data.embeddings?.map((x) => x.values) ?? data.data?.map((x) => x.embedding) ?? []).map((v) => normalize(Float32Array.from(v)));
  if (vectors.length !== texts.length || vectors.some((v) => v.length !== dims)) {
    throw new LlmError("reponse_invalide", "Dimensions ou nombre d'embeddings inattendus.");
  }
  return vectors;
}
