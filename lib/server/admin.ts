import "server-only";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "node:crypto";
import { currentAdmin } from "./session";
import { env } from "./env";
import { verifyPassword } from "./password";

/** Garde serveur : à appeler dans CHAQUE page et action d'administration (pas seulement le layout). */
export async function requireAdmin(): Promise<string> {
  const admin = await currentAdmin();
  if (!admin) redirect("/gestion/connexion");
  return admin.email;
}

export function adminConfigured() {
  const e = env();
  return Boolean(e.ADMIN_EMAIL && (e.ADMIN_PASSWORD_HASH || e.ADMIN_PASSWORD));
}

/** Vérifie le mot de passe : empreinte scrypt si fournie, sinon secret du coffre (comparaison à temps constant). */
export function verifyAdminPassword(password: string): boolean {
  const e = env();
  if (e.ADMIN_PASSWORD_HASH) return verifyPassword(password, e.ADMIN_PASSWORD_HASH);
  if (!e.ADMIN_PASSWORD) return false;
  const a = createHash("sha256").update(password).digest();
  const b = createHash("sha256").update(e.ADMIN_PASSWORD).digest();
  return timingSafeEqual(a, b);
}
