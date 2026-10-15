import Link from "next/link";
import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { generationStatus } from "@/lib/server/llm/registry";
import { indexProgress } from "@/lib/server/embed-job";
import { corpusCounts } from "@/lib/server/study/retrieval";
import { listJobs } from "@/lib/server/jobs";

export default async function Dashboard() {
  await requireAdmin();
  const d = db();
  const count = (sql: string) => (d.prepare(sql).get() as { n: number }).n;
  const stats = {
    downloads: count("SELECT COUNT(*) AS n FROM download_requests"),
    unread: count("SELECT COALESCE(SUM(unread_for_admin),0) AS n FROM conversations"),
    exchanges7: count("SELECT COUNT(*) AS n FROM etude_conversations WHERE date_heure >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-7 days')"),
    worksToClassify: count("SELECT COUNT(*) AS n FROM works WHERE status = 'a_classer'"),
    worksWithoutEdition: count("SELECT COUNT(*) AS n FROM works w WHERE w.status = 'publie' AND NOT EXISTS (SELECT 1 FROM editions e WHERE e.work_id = w.id AND e.status = 'publiee')"),
    failedJobs: count("SELECT COUNT(*) AS n FROM jobs WHERE status = 'echec'"),
  };
  const gen = generationStatus();
  const idx = indexProgress();
  const corpus = corpusCounts();
  const jobs = listJobs(5);
  return (
    <>
      <h1 className="admin__title">Tableau de bord</h1>
      <dl className="stat-list">
        <div><dt>Demandes d&apos;ouvrages</dt><dd><Link href="/gestion/telechargements">{stats.downloads}</Link></dd></div>
        <div><dt>Messages non lus</dt><dd><Link href="/gestion/messages">{stats.unread}</Link></dd></div>
        <div><dt>Questions d&apos;étude (7 jours)</dt><dd><Link href="/gestion/observatoire">{stats.exchanges7}</Link></dd></div>
        <div><dt>Œuvres à classer</dt><dd><Link href="/gestion/catalogue">{stats.worksToClassify}</Link></dd></div>
        <div><dt>Œuvres publiées sans fichier</dt><dd><Link href="/gestion/catalogue">{stats.worksWithoutEdition}</Link></dd></div>
        <div><dt>Tâches en échec</dt><dd><Link href="/gestion/taches">{stats.failedJobs}</Link></dd></div>
      </dl>

      <section className="admin__panel">
        <h2>Moteur d&apos;étude</h2>
        <ul className="plain-list">
          <li>Passages consultables : {corpus.textes} (textes) · {corpus.predications} (prédications)</li>
          <li>
            Synthèse : {gen.configured ? `activée — ${gen.models.join(" → ")}` : "non activée (mode documentaire)"}
            {gen.crossProvider ? " · repli inter-fournisseur autorisé" : ""}
          </li>
          <li>Clés présentes côté serveur : Gemini {gen.keys.gemini ? "oui" : "non"} · OpenAI {gen.keys.openai ? "oui" : "non"} (valeurs jamais affichées)</li>
          <li>
            Index sémantique :{" "}
            {idx.configured ? `${idx.embedded} / ${idx.total} passages (${idx.total ? Math.floor((idx.embedded / idx.total) * 100) : 0} %) — espace ${idx.space}` : "non configuré (recherche lexicale seule)"}
          </li>
        </ul>
        <p className="subtle">Les modèles ne sont pas vérifiés en direct ici : exécutez <code>pnpm models:check</code> sur le serveur.</p>
      </section>

      <section className="admin__panel">
        <h2>Dernières tâches</h2>
        {jobs.length === 0 ? <p className="muted">Aucune tâche.</p> : (
          <ul className="plain-list">
            {jobs.map((j) => (
              <li key={j.id}>{j.type} — {j.status} {j.progressTotal ? `(${j.progressDone}/${j.progressTotal})` : ""}</li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
