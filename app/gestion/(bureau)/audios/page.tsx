import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/admin";
import { listAudios, saveAudio, setAudioStatus } from "@/lib/server/audios";
import { PILLARS, PILLAR_IDS } from "@/lib/domain/pillars";
import { Flash, flashUrl } from "@/components/ui/Flash";
import { audit } from "@/lib/server/audit";

async function upload(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  let target: string;
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choisissez un fichier audio.");
    const pillar = String(formData.get("pillar"));
    if (!PILLAR_IDS.includes(pillar as (typeof PILLAR_IDS)[number])) throw new Error("Pilier requis.");
    const title = String(formData.get("title") ?? "").trim().slice(0, 200);
    if (!title) throw new Error("Titre requis.");
    const id = await saveAudio({ title, pillar, theme: String(formData.get("theme") ?? "").trim() || null, data: new Uint8Array(await file.arrayBuffer()), originalName: file.name });
    audit(who, "audio.televersement", id);
    target = flashUrl("/gestion/audios", "ok", "Audio enregistré en brouillon (original conservé).");
  } catch (e) {
    target = flashUrl("/gestion/audios", "erreur", e instanceof Error ? e.message : "Erreur.");
  }
  redirect(target);
}

async function updateStatus(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  const id = String(formData.get("id"));
  const status = formData.get("status") === "publie" ? "publie" : "brouillon";
  setAudioStatus(id, status, String(formData.get("transcript") ?? "").trim() || null);
  audit(who, "audio.statut", id, { status });
  redirect(flashUrl("/gestion/audios", "ok", "Audio mis à jour."));
}

export default async function AudiosAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const audios = listAudios(false);
  return (
    <>
      <h1 className="admin__title">Enseignements audio</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      <p className="subtle">
        Les fichiers .opus exportés de WhatsApp sont acceptés et conservés tels quels. Safari (iOS anciens) peut ne pas lire Opus :
        aucune conversion serveur n&apos;est encore installée (voir limites). La transcription est saisie et contrôlée par le ministère.
      </p>
      <form action={upload} className="form admin__panel">
        <div className="form__row">
          <div className="field"><label htmlFor="title">Titre</label><input id="title" name="title" required maxLength={200} /></div>
          <div className="field">
            <label htmlFor="pillar">Pilier</label>
            <select id="pillar" name="pillar" required defaultValue="">
              <option value="" disabled>Choisir…</option>
              {PILLARS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="theme">Thème</label><input id="theme" name="theme" maxLength={80} /></div>
        </div>
        <div className="field"><label htmlFor="file">Fichier (.opus, .ogg, .mp3, .m4a — 60 Mo max.)</label><input id="file" name="file" type="file" accept=".opus,.ogg,.mp3,.m4a,audio/*" required /></div>
        <button type="submit" className="btn btn--solid btn--small">Téléverser</button>
      </form>
      {audios.map((a) => (
        <section key={a.id} className="admin__panel">
          <h2>{a.title}</h2>
          <p className="subtle">{a.originalName} · {a.mime} · {(a.byteSize / 1024 / 1024).toFixed(1)} Mo · {a.status}</p>
          <audio controls preload="none" src={`/api/audios/${a.id}`} />
          <form action={updateStatus} className="form">
            <input type="hidden" name="id" value={a.id} />
            <div className="field"><label htmlFor={`tr-${a.id}`}>Transcription contrôlée (facultative)</label><textarea id={`tr-${a.id}`} name="transcript" rows={4} defaultValue={a.transcript ?? ""} /></div>
            <div className="actions">
              <button type="submit" name="status" value="brouillon" className="btn btn--line btn--small">Brouillon</button>
              <button type="submit" name="status" value="publie" className="btn btn--solid btn--small">Publier</button>
            </div>
          </form>
        </section>
      ))}
    </>
  );
}
