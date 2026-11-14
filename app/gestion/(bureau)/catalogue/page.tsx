import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/admin";
import { listAllWorks, listDriveSources, listEditions } from "@/lib/server/catalog";
import { classifyWork, importEditionFile, publishEdition, setWorkStatus, PublishError } from "@/lib/server/editions";
import { saveCover } from "@/lib/server/covers";
import { PILLARS, PILLAR_IDS } from "@/lib/domain/pillars";
import { Flash, flashUrl } from "@/components/ui/Flash";
import { audit } from "@/lib/server/audit";
import { driveConfigured, lastDriveReport } from "@/lib/server/drive";
import { enqueue } from "@/lib/server/jobs";

const PATH = "/gestion/catalogue";
const msg = (e: unknown) => (e instanceof Error ? e.message : "Erreur inattendue.");

async function uploadEdition(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  const file = formData.get("file");
  const workId = String(formData.get("workId"));
  let target: string;
  try {
    if (!(file instanceof File) || file.size === 0) throw new Error("Choisissez un fichier PDF.");
    const label = String(formData.get("label") ?? "").trim() || `Édition du ${new Date().toISOString().slice(0, 10)}`;
    const driveFileId = String(formData.get("driveFileId") ?? "").trim() || null;
    const res = await importEditionFile({ workId, label, data: new Uint8Array(await file.arrayBuffer()), sourceKind: driveFileId ? "drive" : "televersement", driveFileId });
    audit(who, "edition.import", res.editionId, { workId, duplicate: res.duplicate });
    target = flashUrl(PATH, "ok", res.duplicate ? "Ce fichier (même SHA-256) est déjà enregistré : aucune nouvelle édition." : "Édition brouillon créée. L'extraction est confiée au worker (voir Tâches).");
  } catch (e) {
    target = flashUrl(PATH, "erreur", msg(e));
  }
  redirect(target);
}

async function publish(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  let target: string;
  try {
    publishEdition(String(formData.get("editionId")), who);
    target = flashUrl(PATH, "ok", "Édition publiée. L'ancienne édition reste consultable pour les références existantes.");
  } catch (e) {
    target = flashUrl(PATH, "erreur", e instanceof PublishError ? e.message : msg(e));
  }
  redirect(target);
}

async function classify(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  let target: string;
  try {
    const pillar = String(formData.get("pillar"));
    if (!PILLAR_IDS.includes(pillar as (typeof PILLAR_IDS)[number])) throw new Error("Pilier invalide.");
    const theme = String(formData.get("theme") ?? "").trim().slice(0, 80) || null;
    classifyWork(String(formData.get("workId")), pillar, theme, who);
    target = flashUrl(PATH, "ok", "Classification enregistrée.");
  } catch (e) {
    target = flashUrl(PATH, "erreur", msg(e));
  }
  redirect(target);
}

async function changeStatus(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  let target: string;
  try {
    const status = String(formData.get("status"));
    if (status !== "publie" && status !== "a_classer" && status !== "retire") throw new Error("Statut invalide.");
    setWorkStatus(String(formData.get("workId")), status, who);
    target = flashUrl(PATH, "ok", "Statut mis à jour.");
  } catch (e) {
    target = flashUrl(PATH, "erreur", msg(e));
  }
  redirect(target);
}

async function uploadCover(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  let target: string;
  try {
    const file = formData.get("cover");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choisissez une image.");
    const workId = String(formData.get("workId"));
    await saveCover(workId, new Uint8Array(await file.arrayBuffer()));
    audit(who, "couverture.televersement", workId);
    target = flashUrl(PATH, "ok", "Couverture enregistrée.");
  } catch (e) {
    target = flashUrl(PATH, "erreur", msg(e));
  }
  redirect(target);
}

async function syncNow() {
  "use server";
  const who = await requireAdmin();
  if (!driveConfigured()) redirect(flashUrl(PATH, "erreur", "Synchronisation Drive non configurée (compte de service)."));
  const job = enqueue("drive.sync", {}, "drive.sync");
  audit(who, "drive.sync.demande", job.id);
  redirect(flashUrl(PATH, "ok", "Synchronisation demandée : le worker importe les nouvelles révisions en brouillon (voir Tâches)."));
}

const STATUS_LABEL = { publie: "publiée", a_classer: "à classer (non publiée)", retire: "retirée" } as const;

export default async function CataloguePage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const works = listAllWorks();
  const drive = listDriveSources();
  return (
    <>
      <h1 className="admin__title">Catalogue &amp; éditions</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      <p className="muted">
        Une édition est immuable et identifiée par l&apos;empreinte SHA-256 de son fichier. Importer un fichier crée un brouillon ;
        la publication est une action distincte. Aucune œuvre n&apos;est classée automatiquement.
      </p>

      {works.map((w) => {
        const editions = listEditions(w.id);
        return (
          <section key={w.id} className="admin__panel" aria-labelledby={`w-${w.id}`}>
            <h2 id={`w-${w.id}`}>{w.title}</h2>
            <p className="subtle">
              Identifiant <code>{w.id}</code> · statut : {STATUS_LABEL[w.status]} · pilier : {PILLARS.find((p) => p.id === w.pillar)?.label ?? "non classé"}
              {w.pageCountCatalog ? ` · ${w.pageCountCatalog} pages selon l'ancien catalogue (à vérifier)` : ""}
            </p>

            <div className="admin__forms">
              <form action={classify} className="form form--inline">
                <input type="hidden" name="workId" value={w.id} />
                <div className="field">
                  <label htmlFor={`p-${w.id}`}>Pilier</label>
                  <select id={`p-${w.id}`} name="pillar" defaultValue={w.pillar ?? ""} required>
                    <option value="" disabled>Choisir…</option>
                    {PILLARS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`t-${w.id}`}>Thème</label>
                  <input id={`t-${w.id}`} name="theme" defaultValue={w.theme ?? ""} maxLength={80} />
                </div>
                <button className="btn btn--line btn--small" type="submit">Classer</button>
              </form>

              <form action={changeStatus} className="form form--inline">
                <input type="hidden" name="workId" value={w.id} />
                <div className="field">
                  <label htmlFor={`s-${w.id}`}>Statut de l&apos;œuvre</label>
                  <select id={`s-${w.id}`} name="status" defaultValue={w.status}>
                    <option value="publie">Publiée</option>
                    <option value="a_classer">À classer (masquée)</option>
                    <option value="retire">Retirée (masquée)</option>
                  </select>
                </div>
                <button className="btn btn--line btn--small" type="submit">Appliquer</button>
              </form>

              <form action={uploadEdition} className="form form--inline">
                <input type="hidden" name="workId" value={w.id} />
                <div className="field">
                  <label htmlFor={`f-${w.id}`}>Fichier PDF (nouvelle édition)</label>
                  <input id={`f-${w.id}`} name="file" type="file" accept="application/pdf,.pdf" required />
                </div>
                <div className="field">
                  <label htmlFor={`l-${w.id}`}>Libellé de l&apos;édition</label>
                  <input id={`l-${w.id}`} name="label" maxLength={120} placeholder="ex. Édition numérique 2026" />
                </div>
                <div className="field">
                  <label htmlFor={`d-${w.id}`}>ID Drive d&apos;origine (facultatif)</label>
                  <input id={`d-${w.id}`} name="driveFileId" maxLength={80} />
                </div>
                <button className="btn btn--line btn--small" type="submit">Importer</button>
              </form>

              <form action={uploadCover} className="form form--inline">
                <input type="hidden" name="workId" value={w.id} />
                <div className="field">
                  <label htmlFor={`c-${w.id}`}>Couverture réelle (JPEG/PNG/WebP)</label>
                  <input id={`c-${w.id}`} name="cover" type="file" accept="image/jpeg,image/png,image/webp" required />
                </div>
                <button className="btn btn--line btn--small" type="submit">Téléverser</button>
              </form>
            </div>

            {editions.length ? (
              <div className="table-wrap" tabIndex={0} role="region" aria-label={`Éditions de ${w.title}`}>
                <table className="table">
                  <thead><tr><th>Édition</th><th>Statut</th><th>Extraction</th><th>Pages</th><th>SHA-256</th><th>Source</th><th /></tr></thead>
                  <tbody>
                    {editions.map((e) => (
                      <tr key={e.id}>
                        <td>{e.label}<br /><span className="subtle">{new Date(e.createdAt).toLocaleDateString("fr-FR")}</span></td>
                        <td>{e.status}</td>
                        <td>{e.extractionStatus}{e.pagesWithoutText ? ` · ${e.pagesWithoutText} page(s) sans texte (OCR à prévoir)` : ""}</td>
                        <td>{e.pageCount || "—"}</td>
                        <td><code title={e.sha256}>{e.sha256.slice(0, 12)}…</code></td>
                        <td>{e.sourceKind}{e.driveFileId ? ` · ${e.driveFileId}` : ""}</td>
                        <td>
                          {e.status === "brouillon" ? (
                            <form action={publish}>
                              <input type="hidden" name="editionId" value={e.id} />
                              <button className="btn btn--solid btn--small" type="submit">Publier</button>
                            </form>
                          ) : null}
                          <a className="btn btn--ghost btn--small" href={`/lecture/${w.id}?page=1&edition=${e.id}`}>Vérifier</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="subtle">Aucune édition importée : la liseuse et l&apos;étude ne disposent pas encore du texte.</p>
            )}
          </section>
        );
      })}

      <section className="admin__panel">
        <h2>Provenance Google Drive</h2>
        {driveConfigured() ? (
          <form action={syncNow} className="actions">
            <button type="submit" className="btn btn--solid btn--small">Synchroniser le dossier autorisé</button>
          </form>
        ) : (
          <p className="notice">Synchronisation automatique non configurée : partagez le dossier, en lecture, avec un compte de service Google et renseignez GOOGLE_SERVICE_ACCOUNT_JSON (voir docs/EXPLOITATION.md). L&apos;import manuel reste disponible ci-dessus.</p>
        )}
        {(() => {
          const r = lastDriveReport();
          return r ? <p className="subtle">Dernière synchronisation {new Date(r.at).toLocaleString("fr-FR")} : {r.seen} fichiers, {r.imported} brouillon(s) créé(s), {r.unchanged} inchangé(s), {r.newWorks} œuvre(s) à classer{r.errors.length ? `, ${r.errors.length} erreur(s)` : ""}.</p> : null;
        })()}
        <p className="subtle">
          Inventaire du dossier autorisé « Livre du Docteur B. Silas Gbavou » relevé le 13 octobre 2026 (métadonnées). La taille et la
          date ne prouvent pas l&apos;identité d&apos;un fichier : seule l&apos;empreinte SHA-256 de l&apos;édition importée fait foi.
        </p>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Provenance Drive">
          <table className="table">
            <thead><tr><th>Œuvre</th><th>Nom Drive</th><th>ID</th><th>Taille</th><th>Modifié</th><th>Éditions liées</th><th>Dernier état</th></tr></thead>
            <tbody>
              {drive.map((d) => (
                <tr key={d.fileId}>
                  <td><code>{d.workId}</code></td>
                  <td>{d.name}</td>
                  <td><a href={`https://drive.google.com/file/d/${d.fileId}/view`} target="_blank" rel="noopener noreferrer"><code>{d.fileId}</code></a></td>
                  <td>{(d.sizeBytes / 1024 / 1024).toFixed(2)} Mo</td>
                  <td>{d.modifiedTime?.slice(0, 10)}</td>
                  <td>{d.editionCount}</td>
                  <td>{d.lastStatus ?? "jamais synchronisé"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
