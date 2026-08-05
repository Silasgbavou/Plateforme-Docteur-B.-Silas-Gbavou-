import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/section';
import { listContents } from '@/lib/queries';
import { SITE } from '@/lib/site';
import { formatBytes } from '@/lib/slug';

export const metadata: Metadata = {
  title: 'Livres PDF de l’auteur',
  description:
    'La bibliothèque des ouvrages du Docteur B. Silas Gbavou : consultation en ligne et téléchargement pour usage personnel. Tous droits réservés.',
};

export const revalidate = 300;

export default async function LivresPage() {
  const books = await listContents({ type: 'BOOK', take: 60 });

  return (
    <>
      <PageHero
        eyebrow="Bibliothèque de l’auteur"
        title="Les livres du Docteur B. Silas Gbavou"
        description="Consultation en ligne, et téléchargement autorisé pour un usage strictement personnel. Chaque exemplaire téléchargé est nominatif et porte votre licence de lecture."
      >
        <div className="surface flex flex-wrap items-center gap-x-6 gap-y-3 p-5 text-[13px]">
          <span className="flex items-center gap-2 text-gold-200">
            <ShieldIcon /> {SITE.copyright}
          </span>
          <span className="text-ivory-100/60">Usage personnel autorisé</span>
          <span className="text-ivory-100/60">Revente et monétisation interdites</span>
          <span className="text-ivory-100/60">Exemplaires filigranés et traçables</span>
        </div>
      </PageHero>

      <div className="container-page py-12">
        {books.length === 0 ? (
          <p className="surface px-6 py-12 text-center text-sm text-ivory-100/50">
            Les ouvrages seront publiés prochainement.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/livres/${book.slug}`}
                className="group surface flex gap-5 p-5 transition hover:-translate-y-0.5 hover:border-gold-300/30 hover:shadow-elevated"
              >
                <div className="relative h-[152px] w-[104px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-night-800 to-night-950 shadow-elevated">
                  {book.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="grid h-full place-items-center p-2 text-center font-display text-[13px] leading-tight text-gold-200/80">
                      {book.title.slice(0, 42)}
                    </span>
                  )}
                  <span className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-gold-300/70 to-gold-600/40" />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[19px] leading-snug text-ivory-50 transition group-hover:text-gold-100">
                    {book.title}
                  </h2>
                  {book.summary && (
                    <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-ivory-100/60">
                      {book.summary}
                    </p>
                  )}
                  <p className="mt-3 text-[11.5px] text-ivory-100/40">
                    {[
                      book.pageCount ? `${book.pageCount} pages` : null,
                      book.fileSize ? formatBytes(book.fileSize) : null,
                      'PDF',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <section className="surface mt-14 p-7">
          <h2 className="font-display text-2xl text-ivory-50">Conditions d’utilisation des œuvres</h2>
          <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-ivory-100/65">
            Les ouvrages publiés sur cette plateforme sont la propriété intellectuelle exclusive du
            Docteur B. Silas Gbavou. Ils sont mis à disposition pour l’édification personnelle des
            lecteurs.
          </p>
          <ul className="mt-5 grid gap-2.5 text-[14px] text-ivory-100/70 sm:grid-cols-2">
            <Rule ok>Lecture en ligne libre sur la plateforme</Rule>
            <Rule ok>Téléchargement autorisé pour un usage personnel</Rule>
            <Rule ok>Citation d’extraits avec mention de l’auteur</Rule>
            <Rule>Revente, location ou monétisation sous toute forme</Rule>
            <Rule>Rediffusion massive ou remise en ligne sans autorisation</Rule>
            <Rule>Suppression du filigrane ou des mentions de licence</Rule>
          </ul>
          <p className="mt-6 text-[12.5px] text-ivory-100/45">
            Chaque téléchargement génère un exemplaire nominatif portant un code de licence unique,
            permettant d’identifier l’origine de toute copie diffusée sans autorisation.{' '}
            <Link href="/droits-d-auteur" className="link-underline">
              Lire la notice complète des droits d’auteur
            </Link>
            .
          </p>
        </section>
      </div>
    </>
  );
}

function Rule({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${
          ok ? 'bg-emerald-400/15 text-emerald-300' : 'bg-red-400/15 text-red-300'
        }`}
      >
        {ok ? '✓' : '✕'}
      </span>
      {children}
    </li>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l8 3.5v5.8c0 5-3.4 9.6-8 10.7-4.6-1.1-8-5.7-8-10.7V5.5L12 2zm-1 12.6l5-5-1.4-1.4-3.6 3.6-1.6-1.6L8 11.6l3 3z" />
    </svg>
  );
}
