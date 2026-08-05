import Link from 'next/link';

import { AiAssistant } from '@/components/ai-assistant';
import { ContentGrid } from '@/components/content-card';
import { DailyPanel } from '@/components/daily-panel';
import { SectionHeading } from '@/components/section';
import { getDaily } from '@/lib/daily';
import { prisma } from '@/lib/prisma';
import { corpusStats, listContents } from '@/lib/queries';
import { SITE, whatsappLink } from '@/lib/site';
import { PILLARS } from '@/lib/taxonomy';

export const revalidate = 300;

export default async function HomePage() {
  const [daily, stats, latest, books, pillars] = await Promise.all([
    getDaily(),
    corpusStats(),
    listContents({ take: 6 }),
    listContents({ type: 'BOOK', take: 3 }),
    prisma.pillar.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { contents: { where: { status: 'PUBLISHED' } } } },
        subRubrics: { orderBy: { order: 'asc' }, take: 4, select: { title: true, slug: true } },
      },
    }),
  ]);

  const pillarView = PILLARS.map((seed) => {
    const record = pillars.find((p) => p.key === seed.key);
    return {
      ...seed,
      id: record?.id,
      count: record?._count.contents ?? 0,
      subs: record?.subRubrics ?? seed.subRubrics.slice(0, 4),
    };
  });

  return (
    <>
      {/* ───────────────────────────── Hero ───────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="container-page relative py-16 sm:py-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
            <div className="animate-fade-up">
              <p className="eyebrow mb-4">Plateforme officielle du ministère</p>
              <h1 className="text-balance font-display text-[42px] leading-[1.06] text-ivory-50 sm:text-[58px]">
                Docteur B. Silas Gbavou
              </h1>
              <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ivory-100/70">
                Docteur de la Parole et de la Saine Doctrine, Homme Prophétique, Formateur au
                Prophétique, Dispensateur des Mystères de DIEU et des Réalités Spirituelles du
                Sacerdoce en CHRIST.
              </p>

              <ul className="mt-7 flex flex-wrap gap-2">
                {SITE.titles.slice(0, 4).map((title) => (
                  <li key={title} className="badge">
                    {title}
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/assistant" className="btn-primary">
                  Interroger l’assistant IA
                </Link>
                <Link href="/enseignement-prophetique" className="btn-ghost">
                  Explorer les enseignements
                </Link>
              </div>

              <dl className="mt-11 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5 border-t border-white/10 pt-7 sm:grid-cols-4">
                <Stat label="Vidéos" value={stats.videos} />
                <Stat label="Audios" value={stats.audios} />
                <Stat label="Écrits" value={stats.articles} />
                <Stat label="Livres" value={stats.books} />
              </dl>
            </div>

            <div className="animate-fade-up lg:pl-4" style={{ animationDelay: '120ms' }}>
              <AiAssistant
                title="Le Serviteur — assistant d’étude"
                contextLabel="Interroge l’ensemble du corpus : écrits, vidéos, audios et livres."
                compact
                suggestions={[
                  'Qu’enseigne le Docteur sur le jeûne ?',
                  'Explique-moi le sacerdoce en CHRIST.',
                  'Comment discerner la voix de DIEU ?',
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────── Les trois piliers ───────────────────── */}
      <section className="container-page py-16">
        <SectionHeading
          eyebrow="La règle des 3 piliers"
          title="Toute la doctrine, ordonnée en trois grandes rubriques"
          description="Chaque enseignement — écrit, audio ou vidéo — est rattaché à l’un des trois piliers, puis rangé dans la sous-rubrique thématique qui lui correspond."
        />

        <div className="grid gap-5 lg:grid-cols-3">
          {pillarView.map((pillar, index) => (
            <Link
              key={pillar.slug}
              href={`/${pillar.slug}`}
              className="group surface relative flex flex-col overflow-hidden p-7 transition duration-300 hover:-translate-y-1 hover:border-gold-300/35 hover:shadow-elevated"
            >
              <span className="pointer-events-none absolute -right-4 -top-6 font-display text-[110px] leading-none text-white/[0.035]">
                {String(index + 1).padStart(2, '0')}
              </span>

              <p className="eyebrow">{pillar.count} enseignement{pillar.count > 1 ? 's' : ''}</p>
              <h3 className="mt-3 font-display text-[26px] leading-tight text-ivory-50 transition group-hover:text-gold-100">
                {pillar.title}
              </h3>
              <p className="mt-1 text-[13px] font-medium text-gold-300/75">{pillar.tagline}</p>
              <p className="mt-4 flex-1 text-[14px] leading-relaxed text-ivory-100/60">
                {pillar.description}
              </p>

              <ul className="mt-6 flex flex-wrap gap-1.5">
                {pillar.subs.map((sub) => (
                  <li
                    key={sub.slug}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11.5px] text-ivory-100/65"
                  >
                    {sub.title}
                  </li>
                ))}
                <li className="rounded-full px-1 py-1 text-[11.5px] text-gold-300/70">+</li>
              </ul>

              <span className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-gold-200">
                Entrer dans la rubrique
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="transition group-hover:translate-x-1">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─────────────────── Verset & citation du jour ─────────────────── */}
      <section className="container-page py-6">
        <DailyPanel verse={daily.verse} quote={daily.quote} authorName={SITE.name} />
      </section>

      {/* ───────────────────── Derniers enseignements ───────────────────── */}
      <section className="container-page py-16">
        <SectionHeading
          eyebrow="Publications récentes"
          title="Les derniers enseignements"
          description="Vidéos, audios et écrits, classés automatiquement dans l’arborescence par l’intelligence artificielle."
          action={{ href: '/videos', label: 'Toutes les vidéos' }}
        />
        <ContentGrid
          contents={latest}
          emptyLabel="Les premiers enseignements seront publiés très prochainement."
        />
      </section>

      {/* ─────────────────────────── Livres ─────────────────────────── */}
      {books.length > 0 && (
        <section className="container-page py-8">
          <SectionHeading
            eyebrow="Bibliothèque de l’auteur"
            title="Les livres du Docteur B. Silas Gbavou"
            description="Consultation en ligne et téléchargement pour usage personnel. Chaque exemplaire est nominatif : tous droits réservés, revente strictement interdite."
            action={{ href: '/livres', label: 'Voir la bibliothèque' }}
          />
          <ContentGrid contents={books} />
        </section>
      )}

      {/* ────────────────────── Bureau de consultation ────────────────────── */}
      <section className="container-page py-16">
        <div className="surface-strong relative overflow-hidden p-8 sm:p-12">
          <div className="pointer-events-none absolute inset-0 bg-sacerdotal opacity-70" />
          <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <p className="eyebrow mb-3">Bureau de consultation</p>
              <h2 className="text-balance font-display text-3xl leading-tight text-ivory-50 sm:text-[36px]">
                Une question personnelle ? Écrivez directement au Docteur.
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ivory-100/65">
                Un espace de messagerie privé, interne au site, pour poser vos questions et recevoir
                une réponse. Pour les échanges rapides, le WhatsApp du ministère reste ouvert.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/consultation" className="btn-primary">
                  Ouvrir une consultation
                </Link>
                <a
                  href={whatsappLink('Shalom Docteur, je vous écris depuis la plateforme.')}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost"
                >
                  WhatsApp {SITE.phoneDisplay}
                </a>
              </div>
            </div>

            <ul className="space-y-3 text-sm">
              {[
                'Messagerie privée et chiffrée en transit',
                'Réponse directe du ministère',
                'Historique de vos échanges conservé',
                'Assistant IA disponible 24 h/24 pour les questions d’étude',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-ivory-100/70">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-300/20 text-[11px] text-gold-200">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-ivory-100/45">{label}</dt>
      <dd className="mt-1 font-display text-3xl text-gold-200">{value}</dd>
    </div>
  );
}
