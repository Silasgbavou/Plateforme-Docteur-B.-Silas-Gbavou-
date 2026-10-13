import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPillar } from "@/lib/domain/pillars";
import { listPublishedWorks } from "@/lib/server/catalog";
import { listVideos } from "@/lib/server/videos";
import { listArticles } from "@/lib/server/articles";
import { listAudios } from "@/lib/server/audios";
import { BookCover } from "@/components/library/BookCover";
import { ArrowIcon, PlayIcon } from "@/components/ui/icons";

type Params = Promise<{ pilier: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = getPillar((await params).pilier);
  return p ? { title: p.label, alternates: { canonical: `/enseignements/${p.id}` } } : { title: "Introuvable" };
}

export default async function PillarPage({ params }: { params: Params }) {
  const pillar = getPillar((await params).pilier);
  if (!pillar) notFound();
  const works = listPublishedWorks().filter((w) => w.pillar === pillar.id);
  const videos = listVideos(true).filter((v) => v.pillar === pillar.id);
  const articles = listArticles(true).filter((a) => a.pillar === pillar.id);
  const audios = listAudios(true).filter((a) => a.pillar === pillar.id);
  const themes = [...new Set([...works, ...videos, ...articles, ...audios].map((x) => x.theme).filter((t): t is string => Boolean(t)))];
  const empty = !works.length && !videos.length && !articles.length && !audios.length;

  return (
    <div className="section">
      <div className="container container--wide">
        <header className="page-head">
          <p className="kicker"><span className="oldstyle">{pillar.number}</span>&nbsp;Pilier</p>
          <h1>{pillar.label}</h1>
          {themes.length ? <p className="lead">Thèmes : {themes.join(" · ")}</p> : null}
          <p><Link className="link-arrow" href={`/etude`}>Étudier ce pilier dans le moteur d&apos;étude <ArrowIcon size={16} /></Link></p>
        </header>

        {empty ? <div className="empty"><p className="empty__title">Aucun contenu publié pour ce pilier pour le moment.</p></div> : null}

        {works.length ? (
          <section className="pillar-block" aria-labelledby="h-livres">
            <h2 id="h-livres" className="pillar-block__title">Ouvrages</h2>
            <ul className="shelf__row">
              {works.map((w) => (
                <li key={w.id} className="shelf__item">
                  <Link href={`/ouvrages/${w.id}`} className="shelf__link">
                    <BookCover workId={w.id} title={w.title} pillar={w.pillar} coverKey={w.coverKey} coverWidth={w.coverWidth} coverHeight={w.coverHeight} />
                    <span className="shelf__title">{w.title}</span>
                    {w.theme ? <span className="subtle">{w.theme}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {videos.length ? (
          <section className="pillar-block" aria-labelledby="h-videos">
            <h2 id="h-videos" className="pillar-block__title">Prédications</h2>
            <ul className="media-list">
              {videos.map((v) => (
                <li key={v.id}><Link href={`/videos/${v.id}`}><PlayIcon size={18} /> {v.title}</Link>{v.theme ? <span className="subtle"> · {v.theme}</span> : null}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {articles.length ? (
          <section className="pillar-block" aria-labelledby="h-ecrits">
            <h2 id="h-ecrits" className="pillar-block__title">Écrits</h2>
            <ul className="media-list">
              {articles.map((a) => <li key={a.id}><Link href={`/ecrits/${a.slug}`}>{a.title}</Link>{a.theme ? <span className="subtle"> · {a.theme}</span> : null}</li>)}
            </ul>
          </section>
        ) : null}

        {audios.length ? (
          <section className="pillar-block" aria-labelledby="h-audios">
            <h2 id="h-audios" className="pillar-block__title">Audios</h2>
            <ul className="media-list media-list--audio">
              {audios.map((a) => (
                <li key={a.id}>
                  <p>{a.title}{a.theme ? <span className="subtle"> · {a.theme}</span> : null}</p>
                  <audio controls preload="none" src={`/api/audios/${a.id}`} />
                  {a.transcript ? <details><summary>Transcription</summary><p className="pre">{a.transcript}</p></details> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
