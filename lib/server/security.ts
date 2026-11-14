import "server-only";
import { ApiError } from "./http";
import { env } from "./env";
import { db } from "./db";

/**
 * Protection CSRF pour les mutations : cookies SameSite + vérification de l'origine.
 * Une requête de mutation sans en-tête Origin same-origin est refusée.
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin) throw new ApiError(403, "origine_refusee", "Origine de la requête absente.");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "origine_refusee", "Origine de la requête invalide.");
  }
  const allowed = new Set([host, new URL(env().SITE_URL).host].filter(Boolean));
  if (!allowed.has(originHost)) throw new ApiError(403, "origine_refusee", "Origine de la requête non autorisée.");
}

/** Limiteur à fenêtre fixe, persistant (survit aux redémarrages, partagé entre processus). */
export function rateLimit(key: string, limit: number, windowSec: number) {
  const now = Math.floor(Date.now() / 1000);
  const d = db();
  const result = d.transaction(() => {
    const row = d.prepare("SELECT count, expires_at FROM rate_limits WHERE key = ?").get(key) as
      | { count: number; expires_at: number }
      | undefined;
    if (!row || row.expires_at <= now) {
      d.prepare("INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, expires_at = excluded.expires_at").run(key, now + windowSec);
      return { allowed: true, retryAfter: 0 };
    }
    if (row.count >= limit) return { allowed: false, retryAfter: row.expires_at - now };
    d.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").run(key);
    return { allowed: true, retryAfter: 0 };
  })();
  if (!result.allowed) {
    throw new ApiError(429, "limite_atteinte", "Trop de requêtes. Merci de patienter avant de réessayer.", true, Math.max(1, result.retryAfter));
  }
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "local";
}
