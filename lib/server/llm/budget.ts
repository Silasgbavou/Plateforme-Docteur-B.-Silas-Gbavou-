import "server-only";
import { db } from "../db";
import { env } from "../env";

/**
 * Budget global d'appels fournisseur par minute, partagé par TOUS les utilisateurs et tâches
 * (persistant en base, donc commun aux processus web et worker).
 * L'indexation n'utilise que 60 % du budget : les questions des lecteurs restent prioritaires.
 */
export function acquireLlmSlot(kind: "question" | "indexation", calls = 1): { ok: true } | { ok: false; retryAfterMs: number } {
  const rpm = env().LLM_GLOBAL_RPM;
  const ceiling = kind === "question" ? rpm : Math.max(1, Math.floor(rpm * 0.6));
  const nowSec = Math.floor(Date.now() / 1000);
  const windowStart = nowSec - (nowSec % 60);
  const key = `llm:global:${windowStart}`;
  const d = db();
  return d.transaction(() => {
    const row = d.prepare("SELECT count FROM rate_limits WHERE key = ?").get(key) as { count: number } | undefined;
    const used = row?.count ?? 0;
    if (used + calls > ceiling) return { ok: false as const, retryAfterMs: (windowStart + 60 - nowSec) * 1000 + 250 };
    d.prepare(
      "INSERT INTO rate_limits (key, count, expires_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET count = count + ?",
    ).run(key, calls, windowStart + 120, calls);
    d.prepare("DELETE FROM rate_limits WHERE key LIKE 'llm:global:%' AND expires_at < ?").run(nowSec);
    return { ok: true as const };
  })();
}
