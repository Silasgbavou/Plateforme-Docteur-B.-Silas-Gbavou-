import { z } from 'zod';

import { apiError, apiOk, handleApiError, rateLimit } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const replySchema = z.object({
  message: z.string().min(1, 'Message vide.').max(6000),
  status: z.enum(['OPEN', 'ANSWERED', 'CLOSED']).optional(),
});

async function loadThread(id: string, user: { id: string; role: string }) {
  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!thread) return null;
  // Cloisonnement : un membre ne voit que ses propres consultations.
  if (user.role !== 'ADMIN' && thread.userId !== user.id) return null;
  return thread;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const thread = await loadThread(id, user);
    if (!thread) return apiError('Consultation introuvable.', 404);

    // Marque comme lus les messages de l'interlocuteur.
    const otherRole = user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    await prisma.threadMessage.updateMany({
      where: { threadId: thread.id, authorRole: otherRole, readAt: null },
      data: { readAt: new Date() },
    });

    return apiOk({ thread });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    if (!rateLimit(`reply:${user.id}`, 40, 10 * 60_000)) {
      return apiError('Trop de messages envoyés. Merci de patienter un instant.', 429);
    }

    const thread = await loadThread(id, user);
    if (!thread) return apiError('Consultation introuvable.', 404);
    if (thread.status === 'CLOSED' && user.role !== 'ADMIN') {
      return apiError('Cette consultation est clôturée.', 403);
    }

    const body = replySchema.parse(await request.json());
    const isAdmin = user.role === 'ADMIN';

    const message = await prisma.threadMessage.create({
      data: {
        threadId: thread.id,
        authorId: user.id,
        authorRole: isAdmin ? 'ADMIN' : 'MEMBER',
        body: body.message.trim(),
      },
    });

    await prisma.thread.update({
      where: { id: thread.id },
      data: {
        status: body.status ?? (isAdmin ? 'ANSWERED' : 'OPEN'),
        updatedAt: new Date(),
      },
    });

    return apiOk({ message }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
