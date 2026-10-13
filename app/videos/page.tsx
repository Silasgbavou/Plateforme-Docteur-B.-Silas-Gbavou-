import type { Metadata } from "next";
import Link from "next/link";
import { listVideos } from "@/lib/server/videos";
import { getPillar } from "@/lib/domain/pillars";

export const metadata: Metadata = { title: "Prédications", alternates: { canonical: "/videos" } };

export default function VideosPage() {
  const videos = listVideos(true);
  return (
    <div className="section">
      <div className="container container--standard">
        <header className="page-head">
          <p className="kicker">Prédications</p>
          <h1>Enseignements en vidéo</h1>
        </header>
        {videos.length === 0 ? (
          <div className="empty"><p className="empty__title">Aucune prédication publiée pour le moment.</p></div>
        ) : (
          <ul className="video-grid">
            {videos.map((v) => (
              <li key={v.id}>
                <Link href={`/videos/${v.id}`} className="video-card">
                  <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" width={480} height={360} loading="lazy" decoding="async" />
                  <span className="video-card__title">{v.title}</span>
                  <span className="subtle">{getPillar(v.pillar ?? "")?.label}{v.theme ? ` · ${v.theme}` : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
