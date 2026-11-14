import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCover } from "@/components/library/BookCover";
import { DownloadForm } from "@/components/library/DownloadForm";
import { BookIcon } from "@/components/ui/icons";
import { getPillar } from "@/lib/domain/pillars";
import { getWork } from "@/lib/server/catalog";
import { WATERMARK } from "@/lib/domain/contacts";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const work = getWork(id);
  if (!work || work.status !== "publie") return { title: "Ouvrage introuvable" };
  return {
    title: work.title,
    description: `« ${work.title} », ouvrage du Docteur B. Silas Gbavou — ${getPillar(work.pillar ?? "")?.label ?? ""}.`,
    alternates: { canonical: `/ouvrages/${work.id}` },
  };
}

export default async function WorkPage({ params }: { params: Params }) {
  const { id } = await params;
  const work = getWork(id);
  if (!work || work.status !== "publie") notFound();
  const pillar = work.pillar ? getPillar(work.pillar) : undefined;
  const e = work.edition;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: work.title,
    author: { "@type": "Person", name: "Docteur B. Silas Gbavou" },
    inLanguage: "fr",
    ...(e ? { numberOfPages: e.pageCount, bookFormat: "https://schema.org/EBook" } : {}),
  };

  return (
    <article className="section work">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container container--wide work__grid">
        <div className="work__cover">
          <BookCover workId={work.id} title={work.title} pillar={work.pillar} coverKey={work.coverKey} coverWidth={work.coverWidth} coverHeight={work.coverHeight} priority sizes="(min-width: 64rem) 22rem, 60vw" />
        </div>
        <div className="work__body">
          <nav aria-label="Fil d'Ariane" className="breadcrumb">
            <Link href="/bibliotheque">Bibliothèque</Link>
            {pillar ? (
              <>
                <span aria-hidden="true">/</span>
                <Link href={`/bibliotheque?pilier=${pillar.id}`}>{pillar.label}</Link>
              </>
            ) : null}
          </nav>
          <h1 className="work__title">{work.title}</h1>
          <p className="work__author">Docteur B. Silas Gbavou</p>
          <dl className="facts">
            <div><dt>Pilier</dt><dd>{pillar?.label ?? "—"}</dd></div>
            {work.theme ? <div><dt>Thème</dt><dd>{work.theme}</dd></div> : null}
            <div><dt>Édition</dt><dd>{e ? e.label : "En préparation"}</dd></div>
            {e ? <div><dt>Pages</dt><dd className="oldstyle">{e.pageCount}</dd></div> : null}
            {e?.pagesWithoutText ? (
              <div><dt>Texte</dt><dd>{e.pagesWithoutText} page(s) sans couche texte (non consultables par l&apos;étude)</dd></div>
            ) : null}
          </dl>

          <div className="actions">
            {e ? (
              <Link className="btn btn--solid" href={`/lecture/${work.id}?page=1`}>
                <BookIcon size={18} /> Lire en ligne
              </Link>
            ) : null}
            <Link className="btn btn--line" href={`/etude?ouvrage=${work.id}`}>
              Étudier cet ouvrage
            </Link>
          </div>

          <section className="receive" aria-labelledby="titre-recevoir">
            <h2 id="titre-recevoir" className="receive__title">Recevoir cet ouvrage</h2>
            {e ? (
              <>
                <p className="muted">
                  Le ministère offre cet ouvrage pour un usage personnel. Quelques informations permettent de savoir à qui il
                  est confié. {WATERMARK} : la revente et la diffusion commerciale ne sont pas autorisées.
                </p>
                <DownloadForm workId={work.id} title={work.title} />
              </>
            ) : (
              <p className="muted">Le fichier numérique de cet ouvrage est en cours de préparation par le ministère. Revenez prochainement.</p>
            )}
          </section>
        </div>
      </div>
    </article>
  );
}
