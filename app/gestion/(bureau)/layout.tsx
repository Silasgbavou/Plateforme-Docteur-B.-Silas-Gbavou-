import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/server/admin";
import { closeAdminSession } from "@/lib/server/session";
import { redirect } from "next/navigation";
import { audit } from "@/lib/server/audit";

export const metadata: Metadata = { title: "Bureau", robots: { index: false, follow: false } };

const SECTIONS = [
  ["/gestion", "Tableau de bord"],
  ["/gestion/telechargements", "Téléchargements"],
  ["/gestion/messages", "Messages"],
  ["/gestion/catalogue", "Catalogue & éditions"],
  ["/gestion/videos", "Vidéos"],
  ["/gestion/ecrits", "Écrits"],
  ["/gestion/audios", "Audios"],
  ["/gestion/quotidien", "Sélection du jour"],
  ["/gestion/taches", "Tâches"],
  ["/gestion/observatoire", "Observatoire"],
] as const;

async function logout() {
  "use server";
  const who = await requireAdmin();
  await closeAdminSession();
  audit(who, "admin.deconnexion");
  redirect("/");
}

export default async function BureauLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdmin();
  return (
    <div className="admin container container--wide">
      <aside className="admin__nav" aria-label="Sections du bureau">
        <p className="kicker">Bureau du Docteur</p>
        <ul>
          {SECTIONS.map(([href, label]) => (
            <li key={href}><Link href={href}>{label}</Link></li>
          ))}
        </ul>
        <form action={logout}>
          <p className="subtle">{email}</p>
          <button type="submit" className="btn btn--ghost btn--small">Se déconnecter</button>
        </form>
      </aside>
      <div className="admin__main">{children}</div>
    </div>
  );
}
