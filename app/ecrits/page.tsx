import type { Metadata } from "next";
import Link from "next/link";
import { listArticles } from "@/lib/server/articles";
import { getPillar } from "@/lib/domain/pillars";

export const metadata: Metadata = { title: "Écrits", alternates: { canonical: "/ecrits" } };

export default function EcritsPage() {
  const articles = listArticles(true);
  return (
    <div className="section">
      <div className="container container--reading">
        <header className="page-head"><p className="kicker">Écrits</p><h1>Articles et notes</h1></header>
        {articles.length === 0 ? <div className="empty"><p className="empty__title">Aucun écrit publié pour le moment.</p></div> : (
          <ul className="media-list">
            {articles.map((a) => (
              <li key={a.id}><Link href={`/ecrits/${a.slug}`}>{a.title}</Link><span className="subtle"> · {getPillar(a.pillar)?.label}</span></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
