import type { MetadataRoute } from 'next';

import { prisma } from '@/lib/prisma';
import { SITE } from '@/lib/site';
import { PILLARS } from '@/lib/taxonomy';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, '');

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/assistant`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/videos`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/audios`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/ecrits`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/livres`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/biographie`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/mentions-legales`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/droits-d-auteur`, changeFrequency: 'yearly', priority: 0.4 },
  ];

  const taxonomyRoutes: MetadataRoute.Sitemap = PILLARS.flatMap((pillar) => [
    { url: `${base}/${pillar.slug}`, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...pillar.subRubrics.map((sub) => ({
      url: `${base}/${pillar.slug}/${sub.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]);

  let contentRoutes: MetadataRoute.Sitemap = [];
  try {
    const contents = await prisma.content.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, type: true, updatedAt: true },
      take: 5000,
    });
    contentRoutes = contents.map((content) => ({
      url: `${base}/${content.type === 'BOOK' ? 'livres' : 'contenus'}/${content.slug}`,
      lastModified: content.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch {
    // La base peut être indisponible au moment de la génération.
  }

  return [...staticRoutes, ...taxonomyRoutes, ...contentRoutes];
}
