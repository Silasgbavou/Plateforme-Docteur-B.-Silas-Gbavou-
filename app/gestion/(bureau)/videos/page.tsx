import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/admin";
import { fetchYouTubeTitle, listVideos, upsertVideoDraft, getVideo } from "@/lib/server/videos";
import { parseYouTubeId } from "@/lib/server/transcripts";
import { Flash, flashUrl } from "@/components/ui/Flash";
import { audit } from "@/lib/server/audit";

async function addVideo(formData: FormData) {
  "use server";
  const who = await requireAdmin();
  const id = parseYouTubeId(String(formData.get("url") ?? ""));
  if (!id) redirect(flashUrl("/gestion/videos", "erreur", "Adresse YouTube invalide (youtube.com/watch?v=…, youtu.be/…, /live/…, /shorts/…)."));
  if (!getVideo(id)) {
    const title = (await fetchYouTubeTitle(id)) ?? `Vidéo ${id}`;
    upsertVideoDraft(id, title);
    audit(who, "video.ajout", id);
  }
  redirect(`/gestion/videos/${id}`);
}

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const videos = listVideos(false);
  return (
    <>
      <h1 className="admin__title">Prédications vidéo</h1>
      <Flash ok={sp.ok} erreur={sp.erreur} />
      <form action={addVideo} className="form form--inline admin__panel">
        <div className="field">
          <label htmlFor="url">Adresse de la vidéo YouTube</label>
          <input id="url" name="url" type="url" required placeholder="https://www.youtube.com/watch?v=…" />
        </div>
        <button className="btn btn--solid btn--small" type="submit">Ajouter</button>
      </form>
      {videos.length === 0 ? <p className="muted">Aucune vidéo.</p> : (
        <ul className="conv-list">
          {videos.map((v) => (
            <li key={v.id}>
              <Link href={`/gestion/videos/${v.id}`}><strong>{v.title}</strong></Link>
              <span className="subtle"> · {v.status} · {v.transcriptSource ? `transcription ${v.transcriptSource}${v.timed ? " horodatée" : " non horodatée"}` : "sans transcription"}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
