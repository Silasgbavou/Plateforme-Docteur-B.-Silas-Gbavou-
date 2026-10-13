import "server-only";
import { redirect } from "next/navigation";
import { currentAdmin } from "./session";

/** Garde serveur : à appeler dans CHAQUE page et action d'administration (pas seulement le layout). */
export async function requireAdmin(): Promise<string> {
  const admin = await currentAdmin();
  if (!admin) redirect("/gestion/connexion");
  return admin.email;
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH);
}
