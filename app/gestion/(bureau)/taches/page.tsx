import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/admin";
import { cancelJob, listJobs, retryJob } from "@/lib/server/jobs";
import { indexProgress } from "@/lib/server/embed-job";
import { Flash, flashUrl } from "@/components/ui/Flash";
import { audit } from "@/lib/server/audit";

async function act(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  const id = String(formData.get("id"));
  const action = String(formData.get("action"));
  const done = action === "relancer" ? retryJob(id) : cancelJob(id);
  audit(who, `tache.${action}`, id);
  redirect(flashUrl("/gestion/taches", done ? "ok" : "erreur", done ? "Action appliquée." : "Action impossible dans l'état actuel de la tâche."));
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const jobs = listJobs(100);
  const idx = indexProgress();
  return (
    <>
      <h1 className="admin__title">Tâches de fond</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      <p className="muted">
        Les tâches sont exécutées par le processus <code>pnpm worker</code>, indépendant de ce navigateur : fermer cette page ne les
        interrompt pas. La progression affichée est lue dans la base. Si aucune tâche n&apos;avance, vérifiez que le worker est démarré.
      </p>
      {idx.configured ? (
        <p>Index sémantique : <strong>{idx.embedded}</strong> / {idx.total} passages {idx.embedded === idx.total && idx.total > 0 ? "— complet" : ""}</p>
      ) : null}
      {jobs.length === 0 ? <p className="muted">Aucune tâche.</p> : (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Tâches">
          <table className="table">
            <thead><tr><th>Type</th><th>Statut</th><th>Progression</th><th>Tentatives</th><th>Prochain essai</th><th>Dernière erreur</th><th /></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.type}<br /><span className="subtle">{new Date(j.createdAt).toLocaleString("fr-FR")}</span></td>
                  <td>{j.status}</td>
                  <td>{j.progressTotal ? `${j.progressDone} / ${j.progressTotal}` : "—"}</td>
                  <td>{j.attempts} / {j.maxAttempts}</td>
                  <td>{j.status === "en_attente" ? new Date(j.runAfter).toLocaleString("fr-FR") : "—"}</td>
                  <td className="table__long">{j.lastError ?? ""}</td>
                  <td>
                    {j.status === "echec" || j.status === "abandonne" ? (
                      <form action={act}><input type="hidden" name="id" value={j.id} /><button name="action" value="relancer" className="btn btn--line btn--small">Relancer</button></form>
                    ) : j.status === "en_attente" ? (
                      <form action={act}><input type="hidden" name="id" value={j.id} /><button name="action" value="annuler" className="btn btn--ghost btn--small">Annuler</button></form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
