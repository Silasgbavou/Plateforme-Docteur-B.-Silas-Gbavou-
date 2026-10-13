import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/library/BookCover";
import { ArrowIcon } from "@/components/ui/icons";
import { PILLARS, getPillar } from "@/lib/domain/pillars";
import { listPublishedWorks } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Bibliothèque", alternates: { canonical: "/bibliotheque" } };

type SP = Promise<{ pilier?: string; theme?: string }>;

/** Filtres par liens (fonctionnent sans JavaScript) ; l'URL reflète l'état et se partage. */
export default async function LibraryPage({ searchParams }: { searchParams: SP }) {
  const { pilier, theme } = await searchParams;
  const pillar = pilier ? getPillar(pilier) : undefined;
  const all = listPublishedWorks();
  const inPillar = pillar ? all.filter((w) => w.pillar === pillar.id) : all;
  const themes = [...new Set(inPillar.map((w) => w.theme).filter((t): t is string => Boolean(t)))].sort((a, b) => a.localeCompare(b, "fr"));
  const works = theme ? inPillar.filter((w) => w.theme === theme) : inPillar;
  const href = (p?: string, t?: string) => {
    const q = new URLSearchParams();
    if (p) q.set("pilier", p);
    if (t) q.set("theme", t);
    const s = q.toString();
    return s ? `/bibliotheque?${s}` : "/bibliotheque";
  };

  return (
    <div className="section">
      <div className="container container--wide">
        <header className="page-head">
          <p className="kicker">Bibliothèque</p>
          <h1>Les ouvrages du Docteur B. Silas Gbavou</h1>
          <p className="lead">Chaque ouvrage se lit sur le site, page par page, et peut être reçu au format numérique après une courte demande.</p>
        </header>

        <nav className="filters" aria-label="Filtrer par pilier">
          <ul className="chips">
            <li><Link className="chip" href={href()} aria-current={!pillar ? "true" : undefined}>Tous les piliers</Link></li>
            {PILLARS.map((p) => (
              <li key={p.id}>
                <Link className="chip" href={href(p.id)} aria-current={pillar?.id === p.id ? "true" : undefined}>
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
          {themes.length > 1 ? (
            <ul className="chips chips--secondary" aria-label="Filtrer par thème">
              <li><Link className="chip chip--small" href={href(pillar?.id)} aria-current={!theme ? "true" : undefined}>Tous les thèmes</Link></li>
              {themes.map((t) => (
                <li key={t}>
                  <Link className="chip chip--small" href={href(pillar?.id, t)} aria-current={theme === t ? "true" : undefined}>{t}</Link>
                </li>
              ))}
            </ul>
          ) : null}
        </nav>

        <p className="subtle" role="status" aria-live="polite">
          {works.length === 0 ? "Aucun ouvrage" : works.length === 1 ? "1 ouvrage" : `${works.length} ouvrages`}
          {pillar ? ` — ${pillar.label}` : ""}
          {theme ? ` · ${theme}` : ""}
        </p>

        {works.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Aucun ouvrage ne correspond à ce filtre.</p>
            <p className="muted">Les nouveaux ouvrages apparaissent ici dès leur publication par le ministère.</p>
            <Link className="btn btn--line" href="/bibliotheque">Voir toute la bibliothèque</Link>
          </div>
        ) : (
          <ul className="library-grid">
            {works.map((w, i) => {
              const p = w.pillar ? getPillar(w.pillar) : undefined;
              return (
                <li key={w.id} className="library-card">
                  <Link href={`/ouvrages/${w.id}`} className="library-card__cover" tabIndex={-1} aria-hidden="true">
                    <BookCover workId={w.id} title={w.title} pillar={w.pillar} coverKey={w.coverKey} coverWidth={w.coverWidth} coverHeight={w.coverHeight} priority={i < 3} />
                  </Link>
                  <div className="library-card__body">
                    <p className="library-card__pillar">{p?.label}{w.theme ? ` · ${w.theme}` : ""}</p>
                    <h2 className="library-card__title">{w.title}</h2>
                    <p className="subtle">
                      {w.edition ? `${w.edition.pageCount} pages · ${w.edition.label}` : "Fichier en cours de préparation"}
                    </p>
                    <Link href={`/ouvrages/${w.id}`} className="btn btn--line btn--small">
                      Découvrir l&apos;ouvrage <ArrowIcon size={16} />
                      <span className="visually-hidden"> « {w.title} »</span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
