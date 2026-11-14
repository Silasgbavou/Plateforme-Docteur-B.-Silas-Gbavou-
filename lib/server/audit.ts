import "server-only";
import { db } from "./db";
import { newId } from "./ids";

/** Trace des opérations administratives sensibles (sans données personnelles inutiles). */
export function audit(actor: string, action: string, target?: string, detail?: Record<string, unknown>) {
  db().prepare("INSERT INTO admin_audit (id, actor, action, target, detail) VALUES (?, ?, ?, ?, ?)")
    .run(newId(), actor, action, target ?? null, detail ? JSON.stringify(detail) : null);
}
