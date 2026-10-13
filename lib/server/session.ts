import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sessionSecret, env } from "./env";
import { db } from "./db";
import { newId } from "./ids";

/**
 * Cookies signés HMAC-SHA256. Le contenu n'est pas secret, mais infalsifiable.
 * - "ms_lecteur" : identifiant pseudonyme de lecteur (consultation privée, historique d'étude).
 * - "ms_admin"   : session administrateur, courte durée.
 */
const READER_COOKIE = "ms_lecteur";
const ADMIN_COOKIE = "ms_admin";
const READER_MAX_AGE = 60 * 60 * 24 * 365;
const ADMIN_MAX_AGE = 60 * 60 * 8;

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function seal(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function unseal<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp?: number };
    if (typeof data.exp === "number" && data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}

const secure = () => env().NODE_ENV === "production";

/** Lit l'identité lecteur sans la créer (pour les pages serveur). */
export async function currentReaderId(): Promise<string | null> {
  const jar = await cookies();
  const data = unseal<{ rid: string }>(jar.get(READER_COOKIE)?.value);
  if (!data?.rid) return null;
  const row = db().prepare("SELECT id FROM readers WHERE id = ?").get(data.rid);
  return row ? data.rid : null;
}

/** Retourne l'identité lecteur, en la créant si nécessaire (route handlers uniquement). */
export async function ensureReaderId(): Promise<string> {
  const existing = await currentReaderId();
  if (existing) return existing;
  const rid = newId();
  db().prepare("INSERT INTO readers (id) VALUES (?)").run(rid);
  const jar = await cookies();
  jar.set(READER_COOKIE, seal({ rid }), {
    httpOnly: true,
    sameSite: "lax",
    secure: secure(),
    path: "/",
    maxAge: READER_MAX_AGE,
  });
  return rid;
}

export async function clearReader() {
  const jar = await cookies();
  jar.delete(READER_COOKIE);
}

export interface AdminSession {
  email: string;
  exp: number;
}

export async function currentAdmin(): Promise<AdminSession | null> {
  const jar = await cookies();
  const data = unseal<AdminSession>(jar.get(ADMIN_COOKIE)?.value);
  const configured = env().ADMIN_EMAIL?.toLowerCase();
  if (!data || !configured || data.email !== configured) return null;
  return data;
}

export async function openAdminSession(email: string) {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, seal({ email, exp: Math.floor(Date.now() / 1000) + ADMIN_MAX_AGE }), {
    httpOnly: true,
    sameSite: "strict",
    secure: secure(),
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
}

export async function closeAdminSession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}
