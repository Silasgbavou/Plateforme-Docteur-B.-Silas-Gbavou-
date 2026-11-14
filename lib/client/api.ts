/** Appels JSON typés vers les routes du site, avec erreurs structurées. */
export interface ApiFailure {
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number;
  fields?: Record<string, string>;
  requestId?: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

export async function apiFetch<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...(init?.json !== undefined ? { "content-type": "application/json" } : {}), ...init?.headers },
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
      credentials: "same-origin",
    });
  } catch {
    return {
      ok: false,
      error: {
        code: "reseau",
        message: navigator.onLine === false ? "Vous semblez hors ligne. Vos saisies sont conservées : réessayez une fois reconnecté." : "Le serveur est injoignable. Réessayez dans un instant.",
        retryable: true,
      },
    };
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* corps non JSON */
  }
  if (res.ok) return { ok: true, data: (body as { data: T }).data };
  const err = (body as { error?: ApiFailure; requestId?: string } | null)?.error;
  return {
    ok: false,
    error: {
      code: err?.code ?? `http_${res.status}`,
      message: err?.message ?? "Une erreur est survenue.",
      retryable: err?.retryable ?? res.status >= 500,
      retryAfter: err?.retryAfter,
      fields: err?.fields,
      requestId: (body as { requestId?: string } | null)?.requestId,
    },
  };
}
