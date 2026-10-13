import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/server/articles";
import { getPillar } from "@/lib/domain/pillars";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const a = getArticleBySlug((await params).slug);
  return a && a.status === "publie" ? { title: a.title, alternates: { canonical: `/ecrits/${a.slug}` } } : { title: "Introuvable" };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const a = getArticleBySlug((await params).slug);
  if (!a || a.status !== "publie") notFound();
  return (
    <article className="section">
      <div className="container container--reading">
        <nav className="breadcrumb" aria-label="Fil d'Ariane"><Link href="/ecrits">Écrits</Link></nav>
        <h1>{a.title}</h1>
        <p className="subtle">{getPillar(a.pillar)?.label}{a.theme ? ` · ${a.theme}` : ""}{a.publishedAt ? ` · ${new Date(a.publishedAt).toLocaleDateString("fr-FR")}` : ""}</p>
        <div className="prose article-body">{a.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>
      </div>
    </article>
  );
}
