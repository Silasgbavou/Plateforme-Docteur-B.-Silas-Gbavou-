import { z } from 'zod';

import { apiError, apiOk, clientIp, handleApiError, rateLimit } from '@/lib/api';
import { createSessionCookie, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email('Adresse e-mail invalide.'),
  password: z.string().min(1, 'Mot de passe requis.'),
});

export async function POST(request: Request) {
  try {
    if (!rateLimit(`login:${clientIp(request)}`, 10, 10 * 60_000)) {
      return apiError('Trop de tentatives de connexion. Réessayez dans quelques minutes.', 429);
    }

    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    // Message identique dans les deux cas : on n'indique pas si le compte existe.
    const invalid = apiError('Adresse e-mail ou mot de passe incorrect.', 401);
    if (!user) return invalid;

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) return invalid;

    await createSessionCookie({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
    });

    return apiOk({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    return handleApiError(error);
  }
}
