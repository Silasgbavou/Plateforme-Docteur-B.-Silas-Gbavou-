import { NextResponse, type NextRequest } from 'next/server';

/**
 * Nom du cookie de session — dupliqué volontairement depuis `lib/auth`.
 * Le middleware s'exécute sur l'Edge : importer `lib/auth` y ferait entrer
 * Prisma, bcrypt et `next/headers`, incompatibles avec ce runtime.
 */
const SESSION_COOKIE = 'sgb_session';

/**
 * Garde-fou de bord : redirige vers la connexion toute tentative d'accès aux
 * espaces privés sans cookie de session.
 *
 * Le middleware s'exécute sur l'Edge : il ne vérifie que la *présence* du
 * cookie, pas sa validité. La vérification cryptographique et le contrôle du
 * rôle sont refaits côté serveur dans chaque page et chaque route API — le
 * middleware n'est qu'un raccourci d'expérience utilisateur, jamais la
 * frontière de sécurité.
 */
export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/connexion';
  url.searchParams.set('suite', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/consultation/:path*'],
};
