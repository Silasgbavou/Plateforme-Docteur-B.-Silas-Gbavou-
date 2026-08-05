import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AiAssistant } from '@/components/ai-assistant';
import { ContentGrid } from '@/components/content-card';
import { Breadcrumb, PageHero, SectionHeading } from '@/components/section';
import { prisma } from '@/lib/prisma';
import { listContents } from '@/lib/queries';
import { PILLARS, pillarBySlug } from '@/lib/taxonomy';

export const revalidate = 300;

export function generateStaticParams() {
  return PILLARS.flatMap((pillar) =>
    pillar.subRubrics.map((sub) => ({ pilier: pillar.slug, sousRubrique: sub.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pilier: string; sousRubrique: string }>;
}): Promise<Metadata> {
  const { pilier, sousRubrique } = await params;
  const seed = pillarBySlug(pilier);
  const sub = seed?.subRubrics.find((s) => s.slug === sousRubrique);
  if (!sub) return {};
  return { title: sub.title, description: sub.description };
}

export default async function SubRubricPage({
  params,
}: {
  params: Promise<{ pilier: string; sousRubrique: string }>;
}) {
  const { pilier, sousRubrique } = await params;
  const seed = pillarBySlug(pilier);
  if (!seed) notFound();

  const sub = await prisma.subRubric.findFirst({
    where: { slug: sousRubrique, pillar: { slug: pilier } },
    include: { pillar: true },
  });
  if (!sub) notFound();

  const contents = await listContents({ subRubricSlug: sousRubrique, take: 24 });

  return (
    <>
      <PageHero eyebrow={sub.pillar.title} title={sub.title} description={sub.description} />

      <div className="container-page py-12">
        <Breadcrumb
          items={[
            { href: '/', label: 'Accueil' },
            { href: `/${sub.pillar.slug}`, label: sub.pillar.title },
            { label: sub.title },
          ]}
        />

        <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:items-start">
          <section>
            <SectionHeading
              eyebrow={`${contents.length} enseignement${contents.length > 1 ? 's' : ''}`}
              title="Les enseignements de cette thématique"
            />
            <ContentGrid
              contents={contents}
              emptyLabel="Aucun enseignement n’est encore publié dans cette sous-rubrique."
            />
          </section>

          <aside className="lg:sticky lg:top-24">
            <AiAssistant
              scope="SUBRUBRIC"
              scopeId={sub.id}
              title={`Assistant — ${sub.title}`}
              contextLabel={`Recherche limitée aux enseignements sur « ${sub.title} ».`}
              compact
              suggestions={[
                `Que dit le Docteur sur ${sub.title.toLowerCase()} ?`,
                'Résume-moi les enseignements de cette thématique.',
                'Donne-moi un plan d’étude sur ce sujet.',
              ]}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
