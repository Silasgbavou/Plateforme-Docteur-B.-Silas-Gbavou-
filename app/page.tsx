import Link from "next/link";
import { HeroArch } from "@/components/home/HeroArch";
import { BookCover } from "@/components/library/BookCover";
import { ContactList } from "@/components/site/ContactList";
import { AUTHOR_QUALITIES, STUDY_TITLE } from "@/lib/domain/contacts";
import { PILLARS } from "@/lib/domain/pillars";
import { listPublishedWorks } from "@/lib/server/catalog";
import { todaysSelections } from "@/lib/server/daily";

export default function HomePage() {
  const works = listPublishedWorks();
  const q = [...AUTHOR_QUALITIES];
  const qualitiesSentence = `${q.slice(0, -1).join(", ")} et ${q[q.length - 1]}.`.replace(/^./, (c) => c.toUpperCase());
  const daily = todaysSelections();
  const themesByPillar = new Map<string, Set<string>>();
  for (const w of works) {
    if (!w.pillar) continue;
    const set = themesByPillar.get(w.pillar) ?? new Set<string>();
    if (w.theme) set.add(w.theme);
    themesByPillar.set(w.pillar, set);
  }

  return (
    <>
      <section className="nave" aria-labelledby="titre-accueil">
        <div className="container container--wide nave__grid">
          <div className="nave__text">
            <h1 id="titre-accueil" className="nave__title" translate="no">
              Docteur B. Silas Gbavou
            </h1>
            <p className="nave__qualities">{qualitiesSentence}</p>
            <p className="nave__lead">
              Les livres, enseignements et prédications du Ministère d&apos;Enseignement, réunis en un même lieu pour être lus,
              étudiés et approfondis, source à l&apos;appui.
            </p>
            <div className="nave__actions">
              <Link className="btn btn--light" href="/bibliotheque">
                Ouvrir la bibliothèque
              </Link>
              <Link className="nave__link" href="/etude">
                Étudier le corpus
              </Link>
            </div>
          </div>
          <HeroArch />
        </div>
      </section>

      {daily.length ? (
        <section className="section section--tight daily" aria-labelledby="titre-jour">
          <div className="container container--reading">
            <h2 id="titre-jour" className="daily__title">Pour aujourd&apos;hui</h2>
            {daily.map((d) => (
              <figure key={d.kind} className="daily__item">
                <blockquote>
                  <p>{d.text}</p>
                </blockquote>
                <figcaption>
                  {d.workId && d.pageNumber ? (
                    <Link href={`/lecture/${d.workId}?page=${d.pageNumber}`}>{d.reference}</Link>
                  ) : (
                    d.reference
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section pillars" aria-labelledby="titre-piliers">
        <div className="container container--wide">
          <header className="section-head">
            <h2 id="titre-piliers">Trois piliers d&apos;enseignement</h2>
            <p className="section-head__intro">Chaque ouvrage, prédication ou écrit appartient à l&apos;un de ces piliers.</p>
          </header>
          <ol className="pillars__list">
            {PILLARS.map((p) => {
              const themes = [...(themesByPillar.get(p.id) ?? [])];
              const count = works.filter((w) => w.pillar === p.id).length;
              return (
                <li key={p.id} className="cartouche">
                  <span className="cartouche__number oldstyle" aria-hidden="true">{p.number}</span>
                  <h3 className="cartouche__title">
                    <Link href={`/enseignements/${p.id}`}>{p.label}</Link>
                  </h3>
                  {themes.length ? (
                    <p className="cartouche__themes">{themes.join(", ")}</p>
                  ) : null}
                  <p className="cartouche__meta">
                    {count === 0 ? "Aucun ouvrage publié" : count === 1 ? "1 ouvrage" : `${count} ouvrages`}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="section shelf" aria-labelledby="titre-ouvrages">
        <div className="container container--wide">
          <header className="section-head section-head--split">
            <div>
              <h2 id="titre-ouvrages">Les ouvrages</h2>
            </div>
            <Link className="link-arrow" href="/bibliotheque">
              Toute la bibliothèque
            </Link>
          </header>
          <ul className="shelf__row">
            {works.map((w, i) => (
              <li key={w.id} className="shelf__item">
                <Link href={`/ouvrages/${w.id}`} className="shelf__link">
                  <BookCover workId={w.id} title={w.title} pillar={w.pillar} coverKey={w.coverKey} coverWidth={w.coverWidth} coverHeight={w.coverHeight} priority={i < 2} />
                  <span className="shelf__title">{w.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section study-band" aria-labelledby="titre-etude">
        <div className="container container--wide study-band__grid">
          <div>
            <h2 id="titre-etude">{STUDY_TITLE}</h2>
          </div>
          <div className="study-band__body">
            <p>
              Posez une question : le moteur cherche dans les ouvrages publiés et les prédications transcrites, puis
              présente les passages avec leur titre et leur page. Chaque extrait cité renvoie à la page exacte de
              l&apos;ouvrage.
            </p>
            <p className="muted">
              Lorsque les sources ne suffisent pas, il le dit — et vous oriente vers une consultation privée.
            </p>
            <form action="/etude" method="get" className="study-band__form" role="search">
              <label htmlFor="q-accueil" className="visually-hidden">Votre question</label>
              <input id="q-accueil" name="q" type="search" placeholder="Que disent les ouvrages sur la prière ?" autoComplete="off" />
              <button type="submit" className="btn btn--solid">Étudier</button>
            </form>
          </div>
        </div>
      </section>

      <section className="section contact" id="contact" aria-labelledby="titre-contact">
        <div className="container container--wide contact__grid">
          <div>
            <h2 id="titre-contact">Écrire au ministère</h2>
            <p className="lead">
              Pour une question personnelle, la consultation privée est distincte du moteur d&apos;étude : vos messages
              ne sont lus que par le ministère.
            </p>
            <Link className="btn btn--line" href="/discussion">
              Ouvrir une consultation privée
            </Link>
          </div>
          <ContactList />
        </div>
      </section>
    </>
  );
}
