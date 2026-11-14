import type { Metadata } from "next";
import Link from "next/link";
import { PILLARS } from "@/lib/domain/pillars";
import { listPublishedWorks } from "@/lib/server/catalog";
import { listVideos } from "@/lib/server/videos";
import { listArticles } from "@/lib/server/articles";
import { listAudios } from "@/lib/server/audios";

export const metadata: Metadata = { title: "Enseignements", alternates: { canonical: "/enseignements" } };

export default function TeachingsIndex() {
  const works = listPublishedWorks();
  const videos = listVideos(true);
  const articles = listArticles(true);
  const audios = listAudios(true);
  return (
    <div className="section">
      <div className="container container--wide">
        <header className="page-head">
          <h1>Trois piliers, plusieurs formats</h1>
          <p className="lead">Livres, prédications, écrits et audios sont rangés sous l&apos;un des trois piliers de l&apos;enseignement.</p>
        </header>
        <ol className="pillars__list pillars__list--page">
          {PILLARS.map((p) => {
            const n = (arr: { pillar: string | null }[]) => arr.filter((x) => x.pillar === p.id).length;
            const counts = [
              [n(works), "ouvrage", "ouvrages"],
              [n(videos), "prédication", "prédications"],
              [n(articles), "écrit", "écrits"],
              [n(audios), "audio", "audios"],
            ].filter(([c]) => (c as number) > 0) as [number, string, string][];
            return (
              <li key={p.id} className="cartouche">
                <span className="cartouche__number oldstyle" aria-hidden="true">{p.number}</span>
                <h2 className="cartouche__title"><Link href={`/enseignements/${p.id}`}>{p.label}</Link></h2>
                <p className="cartouche__meta">{counts.length ? counts.map(([c, s, pl]) => `${c} ${c > 1 ? pl : s}`).join(", ") : "Contenus en préparation"}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
