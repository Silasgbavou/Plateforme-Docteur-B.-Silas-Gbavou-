import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEdition, getWork } from "@/lib/server/catalog";
import { currentAdmin } from "@/lib/server/session";
import { PdfReader } from "@/components/reader/PdfReader";
import { WATERMARK } from "@/lib/domain/contacts";

type Params = Promise<{ id: string }>;
type SP = Promise<{ page?: string; edition?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const w = getWork(id);
  return { title: w ? `Lecture — ${w.title}` : "Lecture", robots: { index: false } };
}

export default async function ReaderPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { id } = await params;
  const sp = await searchParams;
  const work = getWork(id);
  if (!work) notFound();
  const admin = await currentAdmin();
  if (work.status !== "publie" && !admin) notFound();

  // Une citation ancienne peut viser une édition remplacée : elle reste lisible.
  let edition = work.edition;
  if (sp.edition) {
    const requested = getEdition(sp.edition);
    if (requested && requested.workId === work.id && (requested.status === "publiee" || requested.status === "remplacee" || admin)) edition = requested;
  }
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  return (
    <div className="reader-page">
      <div className="container container--wide reader-page__head">
        <nav aria-label="Fil d'Ariane" className="breadcrumb">
          <Link href={`/ouvrages/${work.id}`}>{work.title}</Link>
          <span aria-hidden="true">/</span>
          <span>Lecture</span>
        </nav>
        <h1 className="reader-page__title">{work.title}</h1>
        {edition ? (
          <p className="subtle">
            {edition.label}
            {edition.status === "remplacee" ? " — édition antérieure, conservée pour les références" : ""}
          </p>
        ) : null}
      </div>
      {edition ? (
        <PdfReader
          workId={work.id}
          editionId={edition.id}
          fileUrl={`/api/fichiers/${edition.id}?usage=lecture`}
          initialPage={Math.min(page, edition.pageCount || page)}
          pageCount={edition.pageCount}
          watermark={WATERMARK}
          title={work.title}
        />
      ) : (
        <div className="container container--reading empty">
          <p className="empty__title">Le fichier de cet ouvrage n&apos;est pas encore disponible en lecture.</p>
          <p className="muted">Le ministère prépare l&apos;édition numérique. Vous pouvez revenir à la fiche de l&apos;ouvrage.</p>
          <Link className="btn btn--line" href={`/ouvrages/${work.id}`}>Retour à l&apos;ouvrage</Link>
        </div>
      )}
    </div>
  );
}
