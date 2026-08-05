import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AiAssistant } from '@/components/ai-assistant';
import { ContentGrid } from '@/components/content-card';
import { Breadcrumb, PageHero, SectionHeading } from '@/components/section';
import { getPillarWithContents, listContents } from '@/lib/queries';
import { PILLARS, pillarBySlug } from '@/lib/taxonomy';

export const revalidate = 300;

export function generateStaticParams() {
  return PILLARS.map((pillar) => ({ pilier: pillar.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pilier: string }>;
}): Promise<Metadata> {
  const { pilier } = await params;
  const seed = pillarBySlug(pilier);
  if (!seed) return {};
  return {
    title: seed.title,
    description: seed.description,
    openGraph: { title: seed.title, description: seed.description },
  };
}

export default async function PillarPage({ params }: { params: Promise<{ pilier: string }> }) {
  const { pilier } = await params;
  const seed = pillarBySlug(pilier);
  if (!seed) notFound();

  const pillar = await getPillarWithContents(pilier);
  if (!pillar) notFound();

  const contents = await listContents({ pillarSlug: pilier, take: 12 });

  return (
    <>
      <PageHero eyebrow={`Pilier ${PILLARS.findIndex((p) => p.slug === pilier) + 1} sur 3`} title={pillar.title} description={pillar.description}>
        <p className="text-sm font-medium text-gold-300/80">{pillar.tagline}</p>
      </PageHero>

      <div className="container-page py-12">
        <Breadcrumb items={[{ href: '/', label: 'Accueil' }, { label: pillar.title }]} />

        <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-14">
            {/* Sous-rubriques */}
            <section>
              <SectionHeading
                eyebrow="Sous-rubriques"
                title="Les thématiques de cette rubrique"
                description="Chaque thématique spécifique est imbriquée dans ce pilier ; c’est la règle d’organisation de toute la plateforme."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {pillar.subRubrics.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/${pillar.slug}/${sub.slug}`}
                    className="group surface flex items-start justify-between gap-4 p-5 transition hover:border-gold-300/30 hover:bg-white/[0.06]"
                  >
                    <span className="min-w-0">
                      <span className="block font-display text-[19px] text-ivory-50 transition group-hover:text-gold-100">
                        {sub.title}
                      </span>
                      <span className="mt-1.5 block text-[13px] leading-relaxed text-ivory-100/55">
                        {sub.description}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11.5px] text-ivory-100/60">
                      {sub._count.contents}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Contenus du pilier */}
            <section>
              <SectionHeading
                eyebrow="Enseignements"
                title={`Tous les enseignements — ${pillar.title.replace("L'", '')}`}
                description="Vidéos, audios et écrits rattachés à cette rubrique."
              />
              <ContentGrid
                contents={contents}
                emptyLabel="Aucun enseignement n’est encore publié dans cette rubrique."
              />
            </section>
          </div>

          {/* Assistant IA de rubrique */}
          <aside className="lg:sticky lg:top-24">
            <AiAssistant
              scope="PILLAR"
              scopeId={pillar.id}
              title={`Assistant — ${pillar.title.replace("L'Enseignement ", '')}`}
              contextLabel={`Recherche limitée aux enseignements de la rubrique « ${pillar.title} ».`}
              compact
              suggestions={[
                `Fais-moi une synthèse de ${pillar.title.toLowerCase()}.`,
                'Par où commencer dans cette rubrique ?',
                `Que dit le Docteur sur ${pillar.subRubrics[0]?.title.toLowerCase() ?? 'ce thème'} ?`,
              ]}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
