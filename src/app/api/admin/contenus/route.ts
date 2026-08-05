import { z } from 'zod';

import { apiError, apiOk, handleApiError } from '@/lib/api';

import { requireAdmin } from '@/lib/auth';
import { classifyContent, resolveClassification } from '@/lib/classify';
import { prisma } from '@/lib/prisma';
import { indexContent } from '@/lib/rag';
import { uniqueSlug } from '@/lib/slug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().min(3).max(220),
  summary: z.string().max(2000).default(''),
  body: z.string().min(20, 'Le corps de l’enseignement est trop court.').max(400_000),
  pillarKey: z.enum(['PROPHETIQUE', 'SPIRITUEL', 'DOCTRINAL']).optional(),
  subRubricSlug: z.string().optional(),
  tags: z.string().max(500).default(''),
  publish: z.boolean().default(false),
});

/** Création d'un enseignement écrit (classement IA si non imposé). */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = createSchema.parse(await request.json());

    let pillarId: string;
    let subRubricId: string | null;
    let summary = body.summary;
    let tags = body.tags;
    let autoClassified = false;
    let note = 'Classement manuel par l’administrateur.';

    if (body.pillarKey) {
      const pillar = await prisma.pillar.findUnique({
        where: { key: body.pillarKey },
        include: { subRubrics: true },
      });
      if (!pillar) return apiError('Pilier inconnu.', 400);
      pillarId = pillar.id;
      subRubricId = pillar.subRubrics.find((s) => s.slug === body.subRubricSlug)?.id ?? null;
    } else {
      const classification = await classifyContent({ title: body.title, text: body.body });
      const resolved = await resolveClassification(classification);
      pillarId = resolved.pillarId;
      subRubricId = resolved.subRubricId;
      summary = summary || classification.summary;
      tags = tags || classification.keywords.join(', ');
      autoClassified = true;
      note = `${classification.method === 'ia' ? 'IA' : 'Lexical'} · confiance ${(
        classification.confidence * 100
      ).toFixed(0)} % · ${classification.rationale}`;
    }

    const slug = await uniqueSlug(body.title, async (candidate) =>
      Boolean(await prisma.content.findUnique({ where: { slug: candidate } })),
    );

    const content = await prisma.content.create({
      data: {
        type: 'ARTICLE',
        slug,
        title: body.title,
        summary,
        body: body.body,
        pillarId,
        subRubricId,
        autoClassified,
        classificationNote: note,
        tags,
        status: body.publish ? 'PUBLISHED' : 'DRAFT',
        publishedAt: body.publish ? new Date() : null,
      },
    });

    const chunks = body.publish ? await indexContent(content.id) : 0;

    return apiOk({ id: content.id, slug: content.slug, chunks }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
