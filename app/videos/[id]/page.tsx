import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVideo, listSegments } from "@/lib/server/videos";
import { currentAdmin } from "@/lib/server/session";
import { formatTimecode } from "@/lib/domain/study-types";
import { getPillar } from "@/lib/domain/pillars";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const v = getVideo((await params).id);
  return { title: v?.title ?? "Prédication" };
}

/** Lecteur YouTube intégré (domaine sans cookie) au repère demandé ; la vidéo n'est jamais réhébergée. */
export default async function VideoPage({ params, searchParams }: { params: Params; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const v = getVideo(id);
  if (!v || (v.status !== "publiee" && !(await currentAdmin()))) notFound();
  const t = Math.max(0, Number.parseInt((await searchParams).t ?? "", 10) || 0);
  const start = t || v.teachingStartSec || 0;
  const segments = listSegments(id);
  return (
    <div className="section">
      <div className="container container--standard">
        <nav className="breadcrumb" aria-label="Fil d'Ariane"><Link href="/videos">Prédications</Link></nav>
        <h1 className="video-page__title">{v.title}</h1>
        <p className="subtle">{getPillar(v.pillar ?? "")?.label}{v.theme ? ` · ${v.theme}` : ""}</p>
        {v.teachingStartSec != null ? (
          <p><a className="badge" href={`/videos/${id}?t=${v.teachingStartSec}`}>Début de l&apos;enseignement à {formatTimecode(v.teachingStartSec)}</a></p>
        ) : null}
        <div className="video-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?start=${start}&rel=0`}
            title={`Lecteur vidéo : ${v.title}`}
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        </div>
        {segments.length ? (
          <details className="transcript">
            <summary>Transcription {v.timed ? "horodatée" : "(non horodatée)"}</summary>
            <ol>
              {segments.map((s) => (
                <li key={s.seq}>
                  {s.startSec != null ? <a href={`/videos/${id}?t=${Math.floor(s.startSec)}`} className="transcript__time">{formatTimecode(s.startSec)}</a> : null}
                  <span>{s.cleanText}</span>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </div>
    </div>
  );
}
