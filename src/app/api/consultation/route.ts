import { z } from 'zod';

import { apiError, apiOk, clientIp, handleApiError, rateLimit } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  subject: z.string().min(3, 'Précisez l’objet de votre message.').max(160),
  message: z.string().min(5, 'Votre message est trop court.').max(6000),
});

/** Liste des consultations de l'utilisateur (ou de toutes, pour l'admin). */
export async function GET() {
  try {
    const user = await requireUser();
    const threads = await prisma.thread.findMany({
      where: user.role === 'ADMIN' ? {} : { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
    });
    return apiOk({ threads });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Ouverture d'une nouvelle consultation. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    if (!rateLimit(`thread:${user.id}:${clientIp(request)}`, 6, 60 * 60_000)) {
      return apiError(
        'Vous avez ouvert plusieurs consultations récemment. Merci de patienter avant d’en créer une nouvelle.',
        429,
      );
    }

    const body = createSchema.parse(await request.json());

    const thread = await prisma.thread.create({
      data: {
        userId: user.id,
        subject: body.subject.trim(),
        status: 'OPEN',
        messages: {
          create: {
            authorId: user.id,
            authorRole: user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
            body: body.message.trim(),
          },
        },
      },
      include: { messages: true },
    });

    return apiOk({ thread }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
