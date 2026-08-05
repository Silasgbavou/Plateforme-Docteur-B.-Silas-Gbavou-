import { z } from 'zod';

import { apiError, apiOk, clientIp, handleApiError, rateLimit } from '@/lib/api';
import { createSessionCookie, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().min(2, 'Indiquez votre nom.').max(120),
  email: z.string().email('Adresse e-mail invalide.').max(180),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.').max(200),
  city: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    if (!rateLimit(`signup:${clientIp(request)}`, 8, 15 * 60_000)) {
      return apiError('Trop de tentatives. Réessayez dans quelques minutes.', 429);
    }

    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError('Un compte existe déjà avec cette adresse e-mail.', 409);
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: body.name.trim(),
        passwordHash: await hashPassword(body.password),
        city: body.city?.trim() || null,
        country: body.country?.trim() || null,
        role: 'MEMBER',
      },
    });

    await createSessionCookie({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: 'MEMBER',
    });

    return apiOk({ id: user.id, name: user.name, email: user.email, role: user.role }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
