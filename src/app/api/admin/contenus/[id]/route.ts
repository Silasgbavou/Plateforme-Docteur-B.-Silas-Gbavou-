import { unlink } from 'node:fs/promises';

import { z } from 'zod';

import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { classifyContent, resolveClassification } from '@/lib/classify';
import { prisma } from '@/lib/prisma';
import { indexContent } from '@/lib/rag';
import { resolveStoredPath } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const patchSchema = z.object({
  title: z.string().min(3).max(220).optional(),
  summary: z.string().max(2000).optional(),
  body: z.string().max(400_000).optional().nullable(),
  transcript: z.string().max(600_000).optional().nullable(),
  tags: z.string().max(500).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  featured: z.boolean().optional(),
  allowDownload: z.boolean().optional(),
  pillarKey: z.enum(['PROPHETIQUE', 'SPIRITUEL', 'DOCTRINAL']).optional(),
  subRubricSlug: z.string().optional().nullable(),
  /** Relance la classification automatique. */
  reclassify: z.boolean().optional(),
  /** Relance l'indexation RAG. */
  reindex: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = patchSchema.parse(await request.json());

    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) return apiError('Contenu introuvable.', 404);

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.summary !== undefined) data.summary = input.summary;
    if (input.body !== undefined) data.body = input.body;
    if (input.transcript !== undefined) data.transcript = input.transcript;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.featured !== undefined) data.featured = input.featured;
    if (input.allowDownload !== undefined) data.allowDownload = input.allowDownload;

    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === 'PUBLISHED' && !existing.publishedAt) data.publishedAt = new Date();
    }

    // Classement manuel imposé par l'administrateur.
    if (input.pillarKey) {
      const pillar = await prisma.pillar.findUnique({
        where: { key: input.pillarKey },
        include: { subRubrics: true },
      });
      if (!pillar) return apiError('Pilier inconnu.', 400);
      data.pillarId = pillar.id;
      data.subRubricId = input.subRubricSlug
        ? (pillar.subRubrics.find((s) => s.slug === input.subRubricSlug)?.id ?? null)
        : null;
      data.autoClassified = false;
      data.classificationNote = 'Classement manuel par l’administrateur.';
    }

    // Reclassement automatique demandé.
    if (input.reclassify) {
      const text =
        (input.transcript ?? existing.transcript) ||
        (input.body ?? existing.body) ||
        existing.summary ||
        existing.title;
      const classification = await classifyContent({
        title: input.title ?? existing.title,
        text,
      });
      const resolved = await resolveClassification(classification);
      data.pillarId = resolved.pillarId;
      data.subRubricId = resolved.subRubricId;
      data.autoClassified = true;
      data.summary = data.summary ?? classification.summary;
      data.tags = data.tags ?? classification.keywords.join(', ');
      data.classificationNote = `${
        classification.method === 'ia' ? 'IA' : 'Lexical'
      } · confiance ${(classification.confidence * 100).toFixed(0)} % · ${classification.rationale}`;
    }

    const updated = await prisma.content.update({ where: { id }, data });

    let chunks: number | undefined;
    const shouldIndex =
      input.reindex ||
      input.transcript !== undefined ||
      input.body !== undefined ||
      (input.status === 'PUBLISHED' && existing.status !== 'PUBLISHED');

    if (shouldIndex && updated.status === 'PUBLISHED') {
      chunks = await indexContent(id);
    }

    return apiOk({ id: updated.id, status: updated.status, chunks });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const content = await prisma.content.findUnique({ where: { id } });
    if (!content) return apiError('Contenu introuvable.', 404);

    // Nettoyage des fichiers associés (best effort).
    for (const relative of [content.audioPath, content.filePath]) {
      if (!relative) continue;
      try {
        await unlink(resolveStoredPath(relative));
      } catch {
        /* fichier déjà absent */
      }
    }

    await prisma.content.delete({ where: { id } });
    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
