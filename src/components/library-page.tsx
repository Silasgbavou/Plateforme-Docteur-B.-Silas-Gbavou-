import { Suspense } from 'react';

import { AiAssistant } from '@/components/ai-assistant';
import { ContentGrid } from '@/components/content-card';
import { LibraryFilters } from '@/components/library-filters';
import { PageHero } from '@/components/section';
import { prisma } from '@/lib/prisma';
import { listContents } from '@/lib/queries';
import type { ContentType } from '@/lib/taxonomy';

/** Gabarit commun aux bibliothèques Vidéos / Audios / Écrits. */
export async function LibraryPage({
  type,
  eyebrow,
  title,
  description,
  searchParams,
  assistantTitle,
  suggestions,
  emptyLabel,
}: {
  type: ContentType;
  eyebrow: string;
  title: string;
  description: string;
  searchParams: { q?: string; pilier?: string };
  assistantTitle: string;
  suggestions: string[];
  emptyLabel: string;
}) {
  const pillars = await prisma.pillar.findMany({
    orderBy: { order: 'asc' },
    select: {
      slug: true,
      title: true,
      _count: { select: { contents: { where: { status: 'PUBLISHED', type } } } },
    },
  });

  const contents = await listContents({
    type,
    pillarSlug: searchParams.pilier,
    search: searchParams.q,
    take: 48,
  });

  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} description={description} />

      <div className="container-page py-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_360px] lg:items-start">
          <div>
            <Suspense fallback={<div className="mb-9 h-24" />}>
              <LibraryFilters
                pillars={pillars.map((p) => ({
                  slug: p.slug,
                  title: p.title,
                  count: p._count.contents,
                }))}
              />
            </Suspense>

            <p className="mb-5 text-[13px] text-ivory-100/45">
              {contents.length} résultat{contents.length > 1 ? 's' : ''}
              {searchParams.q ? ` pour « ${searchParams.q} »` : ''}
            </p>

            <ContentGrid contents={contents} emptyLabel={emptyLabel} />
          </div>

          <aside className="lg:sticky lg:top-24">
            <AiAssistant
              title={assistantTitle}
              contextLabel="Interroge l’ensemble du corpus du Docteur."
              compact
              suggestions={suggestions}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
