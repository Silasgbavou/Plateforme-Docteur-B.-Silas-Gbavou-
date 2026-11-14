import Link from "next/link";
import { BookCover } from "@/components/library/BookCover";
import { Medallion } from "@/components/wax/Medallion";
import { Selvedge } from "@/components/wax/Selvedge";
import { HeroTitle } from "@/components/wax/HeroTitle";
import { WordHighlight } from "@/components/wax/WordHighlight";
import { ArchWindow } from "@/components/wax/ArchWindow";
import { AUTHOR_QUALITIES, STUDY_TITLE } from "@/lib/domain/contacts";
import { PILLARS } from "@/lib/domain/pillars";
import { listPublishedWorks } from "@/lib/server/catalog";
import { todaysSelections } from "@/lib/server/daily";

const COUNT_WORDS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze"];

export default function HomePage() {
  const works = listPublishedWorks();
  const daily = todaysSelections();
  const count = works.length;
  const countWord = COUNT_WORDS[count] ?? String(count);
  const themesByPillar = new Map<string, string[]>();
  for (const w of works) {
    if (!w.pillar || !w.theme) continue;
    const list = themesByPillar.get(w.pillar) ?? [];
    if (!list.includes(w.theme)) list.push(w.theme);
    themesByPillar.set(w.pillar, list);
  }
  const q = [...AUTHOR_QUALITIES];
  const qualities = `${q.slice(0, -1).join(", ")} et ${q[q.length - 1]}.`.replace(/^./, (c) => c.toUpperCase());

  return (
    <>
      <section className="fabric-hero screen" aria-labelledby="titre-accueil" data-enter>
        <div className="container container--wide wrap fabric-hero__grid">
          <div className="fabric-hero__text">
            <HeroTitle id="titre-accueil" text="Le ministère d'enseignement du Docteur B. Silas Gbavou" />
            <p className="fabric-hero__lead enter-up">
              Ses {countWord} ouvrages à lire et à recevoir, son enseignement en trois piliers et un moteur d&apos;étude qui
              cite chaque page.
            </p>
            <div className="fabric-hero__actions enter-up">
              <Link className="btn btn--gold" href="/bibliotheque">
                Recevoir un livre
              </Link>
              <Link className="btn btn--cloth" href="/etude">
                Poser une question
              </Link>
            </div>
          </div>
          <div className="fabric-hero__cloth">
            <Medallion priority />
          </div>
        </div>
        <Selvedge />
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
                  {d.workId && d.pageNumber ? <Link href={`/lecture/${d.workId}?page=${d.pageNumber}`}>{d.reference}</Link> : d.reference}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <section className="screen books-screen" id="ouvrages" aria-labelledby="titre-ouvrages">
        <div className="container container--wide wrap">
          <div className="screen__head">
            <h2 id="titre-ouvrages">
              {count === 1 ? "Un ouvrage" : `${countWord.replace(/^./, (c) => c.toUpperCase())} ouvrages`} du Docteur.{" "}
              <span className="muted">À lire en ligne et à recevoir.</span>
            </h2>
            <Link className="link" href="/bibliotheque">
              Voir toute la bibliothèque
            </Link>
          </div>
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

      <section className="screen pillars-band" id="piliers" aria-labelledby="titre-piliers">
        <div className="container container--wide wrap">
          <div className="screen__head">
            <h2 id="titre-piliers">
              Trois piliers d&apos;enseignement. <span className="muted">Chaque ouvrage, prédication ou écrit appartient à l&apos;un d&apos;eux.</span>
            </h2>
          </div>
          <ol className="pillars__list">
            {PILLARS.map((p) => {
              const themes = themesByPillar.get(p.id) ?? [];
              const n = works.filter((w) => w.pillar === p.id).length;
              return (
                <li key={p.id} className="cartouche">
                  <span className="cartouche__number oldstyle" aria-hidden="true">{p.number}</span>
                  {n ? (
                    <div className="cartouche__covers" aria-hidden="true">
                      {works.filter((w) => w.pillar === p.id).slice(0, 4).map((w) => (
                        <BookCover key={w.id} workId={w.id} title={w.title} pillar={w.pillar} coverKey={w.coverKey} coverWidth={w.coverWidth} coverHeight={w.coverHeight} sizes="4rem" />
                      ))}
                    </div>
                  ) : null}
                  <h3 className="cartouche__title">
                    <Link href={`/enseignements/${p.id}`}>{p.label}</Link>
                  </h3>
                  {themes.length ? <p className="cartouche__themes">{themes.join(", ")}.</p> : null}
                  <p className="cartouche__meta">{n === 0 ? "Aucun ouvrage publié" : n === 1 ? "1 ouvrage" : `${n} ouvrages`}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="screen study-screen" id="etude" aria-labelledby="titre-etude">
        <div className="container container--wide wrap study-screen__grid">
          <div className="study-screen__intro">
            <h2 id="titre-etude">{STUDY_TITLE}</h2>
            <p className="study-screen__lead">
              Posez une question : le moteur cherche dans les ouvrages publiés et les prédications transcrites, puis cite le
              titre, la page et le passage exact.
            </p>
            <form action="/etude" method="get" className="study-screen__form" role="search">
              <label htmlFor="q-accueil" className="study-screen__label">Votre question</label>
              <div className="study-screen__row">
                <input id="q-accueil" name="q" type="search" placeholder="Par exemple : que disent les ouvrages sur la prière…" autoComplete="off" />
                <button type="submit" className="btn btn--ink">Poser la question</button>
              </div>
            </form>
          </div>
          <div className="study-screen__aside">
          <ol className="study-steps" aria-label="Ce que contient chaque réponse">
            <li><strong>Les passages retrouvés</strong> dans les ouvrages du Docteur, avec leur titre.</li>
            <li><strong>La page exacte</strong> de chaque passage, qui ouvre la liseuse au bon endroit.</li>
            <li><strong>Une limite dite clairement</strong> quand les sources ne suffisent pas, avec le contact du ministère.</li>
          </ol>
          {works.length ? (
            <div className="study-corpus">
              <p className="study-corpus__label">Les ouvrages où le moteur cherche</p>
              <ul>
                {works.map((w) => (
                  <li key={w.id}>
                    <Link href={`/ouvrages/${w.id}`}>{w.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          </div>
        </div>
      </section>

      <section className="screen docteur-screen" id="docteur" aria-labelledby="titre-docteur">
        <div className="container container--wide wrap docteur-screen__grid">
          <div className="docteur-screen__text">
            <h2 id="titre-docteur">Le Docteur B. Silas Gbavou</h2>
            <WordHighlight text={qualities} strong="Parole" />
            <div className="docteur-screen__actions">
              <Link className="btn btn--ink" href="/discussion">Écrire au ministère</Link>
              <Link className="link" href="/enseignements">Voir les enseignements</Link>
            </div>
          </div>
          <ArchWindow />
        </div>
      </section>
    </>
  );
}
