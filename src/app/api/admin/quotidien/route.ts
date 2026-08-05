import { z } from 'zod';

import { apiOk, handleApiError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  kind: z.enum(['VERSE', 'QUOTE']),
  text: z.string().min(4).max(2000),
  reference: z.string().max(200).optional().nullable(),
  author: z.string().max(200).optional().nullable(),
  /** Date AAAA-MM-JJ pour une programmation ; vide = pool de rotation. */
  date: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Format attendu : AAAA-MM-JJ')
    .default(''),
});

/** Liste des versets et citations. */
export async function GET() {
  try {
    await requireAdmin();
    const items = await prisma.dailyItem.findMany({
      orderBy: [{ kind: 'asc' }, { date: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
    return apiOk({ items });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Ajout d'un verset ou d'une citation. */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = schema.parse(await request.json());

    const item = await prisma.dailyItem.create({
      data: {
        kind: body.kind,
        text: body.text.trim(),
        reference: body.reference?.trim() || null,
        author: body.author?.trim() || null,
        date: body.date,
      },
    });

    return apiOk({ item }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/** Suppression. */
export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return apiOk({ ok: false }, 400);
    await prisma.dailyItem.delete({ where: { id } });
    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
