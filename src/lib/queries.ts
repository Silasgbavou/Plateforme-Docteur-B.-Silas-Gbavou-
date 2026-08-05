import { prisma } from '@/lib/prisma';
import type { ContentType } from '@/lib/taxonomy';

/** Sélection commune pour les cartes de contenu. */
export const CONTENT_CARD_SELECT = {
  id: true,
  slug: true,
  type: true,
  title: true,
  summary: true,
  thumbnailUrl: true,
  durationSec: true,
  fileSize: true,
  pageCount: true,
  publishedAt: true,
  pillar: { select: { title: true, slug: true } },
  subRubric: { select: { title: true, slug: true } },
} as const;

export async function listContents(options: {
  type?: ContentType | ContentType[];
  pillarSlug?: string;
  subRubricSlug?: string;
  featured?: boolean;
  take?: number;
  skip?: number;
  search?: string;
}) {
  const where: Record<string, unknown> = { status: 'PUBLISHED' };
  if (options.type) {
    where.type = Array.isArray(options.type) ? { in: options.type } : options.type;
  }
  if (options.pillarSlug) where.pillar = { slug: options.pillarSlug };
  if (options.subRubricSlug) where.subRubric = { slug: options.subRubricSlug };
  if (options.featured) where.featured = true;
  if (options.search) {
    where.OR = [
      { title: { contains: options.search } },
      { summary: { contains: options.search } },
      { tags: { contains: options.search } },
    ];
  }

  return prisma.content.findMany({
    where,
    select: CONTENT_CARD_SELECT,
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: options.take ?? 24,
    skip: options.skip ?? 0,
  });
}

export async function countContents(where: Record<string, unknown> = {}) {
  return prisma.content.count({ where: { status: 'PUBLISHED', ...where } });
}

export async function getPillarWithContents(slug: string) {
  return prisma.pillar.findUnique({
    where: { slug },
    include: {
      subRubrics: {
        orderBy: { order: 'asc' },
        include: {
          _count: { select: { contents: { where: { status: 'PUBLISHED' } } } },
        },
      },
    },
  });
}

export async function getContentBySlug(slug: string) {
  return prisma.content.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      pillar: { select: { id: true, title: true, slug: true } },
      subRubric: { select: { id: true, title: true, slug: true } },
    },
  });
}

/** Contenus proches : même sous-rubrique en priorité, puis même pilier. */
export async function relatedContents(content: {
  id: string;
  pillarId: string;
  subRubricId: string | null;
}) {
  const bySub = content.subRubricId
    ? await prisma.content.findMany({
        where: {
          status: 'PUBLISHED',
          subRubricId: content.subRubricId,
          id: { not: content.id },
        },
        select: CONTENT_CARD_SELECT,
        take: 3,
        orderBy: { publishedAt: 'desc' },
      })
    : [];

  if (bySub.length >= 3) return bySub;

  const byPillar = await prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      pillarId: content.pillarId,
      id: { not: content.id, notIn: bySub.map((c) => c.id) },
    },
    select: CONTENT_CARD_SELECT,
    take: 3 - bySub.length,
    orderBy: { publishedAt: 'desc' },
  });

  return [...bySub, ...byPillar];
}

/** Statistiques affichées sur la page d'accueil. */
export async function corpusStats() {
  const [articles, audios, videos, books, chunks] = await Promise.all([
    prisma.content.count({ where: { status: 'PUBLISHED', type: 'ARTICLE' } }),
    prisma.content.count({ where: { status: 'PUBLISHED', type: 'AUDIO' } }),
    prisma.content.count({ where: { status: 'PUBLISHED', type: 'VIDEO' } }),
    prisma.content.count({ where: { status: 'PUBLISHED', type: 'BOOK' } }),
    prisma.chunk.count(),
  ]);
  return { articles, audios, videos, books, chunks };
}
