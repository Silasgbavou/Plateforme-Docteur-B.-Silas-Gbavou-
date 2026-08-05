import { apiOk, handleApiError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { embeddingModelName } from '@/lib/embeddings';
import { prisma } from '@/lib/prisma';
import { reindexAll } from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 800;

/** État de l'index RAG. */
export async function GET() {
  try {
    await requireAdmin();
    const [chunks, indexed, pending] = await Promise.all([
      prisma.chunk.count(),
      prisma.content.count({ where: { status: 'PUBLISHED', indexedAt: { not: null } } }),
      prisma.content.count({ where: { status: 'PUBLISHED', indexedAt: null } }),
    ]);
    return apiOk({ chunks, indexed, pending, model: embeddingModelName() });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Réindexation complète du corpus publié. */
export async function POST() {
  try {
    await requireAdmin();
    const result = await reindexAll();
    return apiOk({ ...result, model: embeddingModelName() });
  } catch (error) {
    return handleApiError(error);
  }
}
