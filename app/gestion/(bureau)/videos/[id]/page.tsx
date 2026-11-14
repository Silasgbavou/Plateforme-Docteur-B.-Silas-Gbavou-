import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/admin";
import { attachTranscript, getVideo, listSegments, setTeachingStart, updateVideoMeta } from "@/lib/server/videos";
import { PILLARS, PILLAR_IDS } from "@/lib/domain/pillars";
import { Flash, flashUrl } from "@/components/ui/Flash";
import { formatTimecode } from "@/lib/domain/study-types";
import { audit } from "@/lib/server/audit";

const msg = (e: unknown) => (e instanceof Error ? e.message : "Erreur inattendue.");

async function saveTranscript(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  const id = String(formData.get("id"));
  let target: string;
  try {
    const file = formData.get("file");
    let text = String(formData.get("text") ?? "");
    if (file instanceof File && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) throw new Error("Fichier trop volumineux (5 Mo maximum).");
      text = await file.text();
    }
    if (!text.trim()) throw new Error("Fournissez un fichier SRT/VTT ou collez le texte.");
    const r = attachTranscript(id, text);
    audit(who, "video.transcription", id, r);
    target = flashUrl(`/gestion/videos/${id}`, "ok", `Transcription ${r.format} enregistrée : ${r.segments} segments.${r.format === "texte_brut" ? " Texte non horodaté : aucun repère temporel ne sera affiché." : ""}`);
  } catch (e) {
    target = flashUrl(`/gestion/videos/${id}`, "erreur", msg(e));
  }
  redirect(target);
}

async function saveMeta(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  const id = String(formData.get("id"));
  let target: string;
  try {
    const pillar = String(formData.get("pillar"));
    if (!PILLAR_IDS.includes(pillar as (typeof PILLAR_IDS)[number])) throw new Error("Choisissez un pilier.");
    const status = String(formData.get("status")) as "brouillon" | "publiee" | "retiree";
    if (!["brouillon", "publiee", "retiree"].includes(status)) throw new Error("Statut invalide.");
    const title = String(formData.get("title") ?? "").trim().slice(0, 300);
    if (!title) throw new Error("Titre requis.");
    updateVideoMeta(id, { title, pillar, theme: String(formData.get("theme") ?? "").trim().slice(0, 80) || null, status });
    audit(who, "video.metadonnees", id, { status, pillar });
    target = flashUrl(`/gestion/videos/${id}`, "ok", "Enregistré.");
  } catch (e) {
    target = flashUrl(`/gestion/videos/${id}`, "erreur", msg(e));
  }
  redirect(target);
}

async function saveStart(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  const id = String(formData.get("id"));
  let target: string;
  try {
    const raw = String(formData.get("seq") ?? "");
    setTeachingStart(id, raw === "" ? null : Number(raw), who);
    target = flashUrl(`/gestion/videos/${id}`, "ok", "Repère de début mis à jour.");
  } catch (e) {
    target = flashUrl(`/gestion/videos/${id}`, "erreur", msg(e));
  }
  redirect(target);
}

export default async function VideoAdminPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const v = getVideo(id);
  if (!v) notFound();
  const segments = listSegments(id);
  return (
    <>
      <p><Link href="/gestion/videos">← Vidéos</Link></p>
      <h1 className="admin__title">{v.title}</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />

      <section className="admin__panel">
        <h2>Transcription</h2>
        {!v.transcriptSource ? (
          <p className="notice">
            La récupération automatique des sous-titres n&apos;est pas active dans cette installation : l&apos;API officielle YouTube
            n&apos;autorise le téléchargement des sous-titres qu&apos;avec l&apos;autorisation OAuth du propriétaire de la chaîne, et aucun
            contournement n&apos;est employé. Fournissez la transcription ci-dessous (SRT ou VTT pour conserver les repères temporels,
            ou texte brut).
          </p>
        ) : (
          <p className="subtle">
            Source : {v.transcriptSource} · {v.timed ? "horodatée (repères issus du fichier source)" : "non horodatée (aucun repère temporel ne sera inventé)"} · {segments.length} segments.
          </p>
        )}
        <form action={saveTranscript} className="form">
          <input type="hidden" name="id" value={id} />
          <div className="field">
            <label htmlFor="file">Fichier SRT / VTT / TXT</label>
            <input id="file" name="file" type="file" accept=".srt,.vtt,.txt,text/plain,text/vtt" />
          </div>
          <div className="field">
            <label htmlFor="text">ou texte collé</label>
            <textarea id="text" name="text" rows={6} />
          </div>
          <button type="submit" className="btn btn--line btn--small" disabled={v.status === "publiee"}>Enregistrer la transcription</button>
          {v.status === "publiee" ? <p className="subtle">Repassez la vidéo en brouillon pour remplacer sa transcription.</p> : null}
        </form>
      </section>

      <section className="admin__panel">
        <h2>Classement et publication</h2>
        <form action={saveMeta} className="form form--inline">
          <input type="hidden" name="id" value={id} />
          <div className="field"><label htmlFor="title">Titre</label><input id="title" name="title" defaultValue={v.title} maxLength={300} required /></div>
          <div className="field">
            <label htmlFor="pillar">Pilier</label>
            <select id="pillar" name="pillar" defaultValue={v.pillar ?? ""} required>
              <option value="" disabled>Choisir…</option>
              {PILLARS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="theme">Thème</label><input id="theme" name="theme" defaultValue={v.theme ?? ""} maxLength={80} /></div>
          <div className="field">
            <label htmlFor="status">Statut</label>
            <select id="status" name="status" defaultValue={v.status}>
              <option value="brouillon">Brouillon</option><option value="publiee">Publiée</option><option value="retiree">Retirée</option>
            </select>
          </div>
          <button type="submit" className="btn btn--solid btn--small">Enregistrer</button>
        </form>
      </section>

      {segments.length ? (
        <section className="admin__panel">
          <h2>Segments et début de l&apos;enseignement</h2>
          <p className="subtle">
            Le badge « Début de l&apos;enseignement » n&apos;est publié que s&apos;il pointe vers un segment horodaté par la source. Le texte seul
            ne prouve pas qui parle : choisissez le segment après écoute.
            {v.teachingStartSec != null ? ` Repère actuel : ${formatTimecode(v.teachingStartSec)} (${v.teachingStartProvenance}).` : ""}
          </p>
          <form action={saveStart} className="form">
            <input type="hidden" name="id" value={id} />
            <ol className="segments">
              {segments.map((s) => (
                <li key={s.seq}>
                  <label className="segments__row">
                    <input type="radio" name="seq" value={s.seq} disabled={s.startSec == null} defaultChecked={v.teachingStartSec != null && s.startSec != null && Math.floor(s.startSec) === v.teachingStartSec} />
                    <span className="segments__time">{s.startSec != null ? formatTimecode(s.startSec) : "—"}</span>
                    <span>{s.cleanText}{s.cleanText !== s.rawText ? <span className="subtle"> (épuré ; brut conservé)</span> : null}</span>
                  </label>
                </li>
              ))}
            </ol>
            <div className="actions">
              <button type="submit" className="btn btn--line btn--small">Enregistrer le repère</button>
              <button type="submit" name="seq" value="" className="btn btn--ghost btn--small">Retirer le repère</button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
