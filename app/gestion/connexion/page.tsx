import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/server/env";
import { verifyPassword } from "@/lib/server/password";
import { currentAdmin, openAdminSession } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/security";
import { ApiError } from "@/lib/server/http";
import { audit } from "@/lib/server/audit";
import { adminConfigured } from "@/lib/server/admin";

export const metadata: Metadata = { title: "Connexion — Bureau", robots: { index: false, follow: false } };

async function login(formData: FormData) {
  "use server";
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  try {
    rateLimit(`admin-login:${ip}`, 5, 900);
  } catch (e) {
    if (e instanceof ApiError) redirect("/gestion/connexion?erreur=limite");
    throw e;
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const expected = env().ADMIN_EMAIL?.trim().toLowerCase();
  const valid = Boolean(expected) && email === expected && verifyPassword(password, env().ADMIN_PASSWORD_HASH);
  if (!valid) {
    audit(email || "inconnu", "admin.connexion.echec");
    redirect("/gestion/connexion?erreur=identifiants");
  }
  await openAdminSession(email);
  audit(email, "admin.connexion");
  redirect("/gestion");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  if (await currentAdmin()) redirect("/gestion");
  const { erreur } = await searchParams;
  return (
    <div className="section">
      <div className="container container--reading">
        <header className="page-head">
          <p className="kicker">Bureau du Docteur</p>
          <h1>Connexion</h1>
        </header>
        {!adminConfigured() ? (
          <p className="notice">
            L&apos;accès administrateur n&apos;est pas configuré sur ce serveur (variables ADMIN_EMAIL et ADMIN_PASSWORD_HASH). Voir la
            documentation d&apos;exploitation.
          </p>
        ) : (
          <form action={login} className="form form--narrow">
            {erreur ? (
              <p className="notice notice--error" role="alert">
                {erreur === "limite" ? "Trop de tentatives. Réessayez dans quelques minutes." : "Identifiants incorrects."}
              </p>
            ) : null}
            <div className="field">
              <label htmlFor="email">Adresse email</label>
              <input id="email" name="email" type="email" autoComplete="username" required />
            </div>
            <div className="field">
              <label htmlFor="password">Mot de passe</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required minLength={12} />
            </div>
            <button type="submit" className="btn btn--solid">Se connecter</button>
          </form>
        )}
      </div>
    </div>
  );
}
