import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { requestId } from "./ids";

export interface ApiErrorBody {
  error: { code: string; message: string; retryable: boolean; retryAfter?: number; fields?: Record<string, string> };
  requestId: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryable = false,
    public retryAfter?: number,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data, requestId: requestId() }, init);
}

export function fail(err: unknown) {
  const rid = requestId();
  if (err instanceof ApiError) {
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message, retryable: err.retryable, retryAfter: err.retryAfter, fields: err.fields },
      requestId: rid,
    };
    const headers: Record<string, string> = {};
    if (err.retryAfter) headers["Retry-After"] = String(err.retryAfter);
    return NextResponse.json(body, { status: err.status, headers });
  }
  // Journal technique sans contenu utilisateur : uniquement type et identifiant.
  console.error(`[api] erreur interne requestId=${rid} type=${(err as Error)?.name ?? "inconnu"}`);
  return NextResponse.json(
    { error: { code: "erreur_interne", message: "Une erreur inattendue est survenue.", retryable: true }, requestId: rid } satisfies ApiErrorBody,
    { status: 500 },
  );
}

export function zodFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

export async function readJson(req: Request, maxBytes = 64_000): Promise<unknown> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new ApiError(413, "trop_volumineux", "Requête trop volumineuse.");
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError(413, "trop_volumineux", "Requête trop volumineuse.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "json_invalide", "Corps de requête invalide.");
  }
}
