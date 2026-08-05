import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth-form';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Connexion' };
export const dynamic = 'force-dynamic';

export default async function ConnexionPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === 'ADMIN' ? '/admin' : '/consultation');

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="eyebrow mb-2">Espace membre</p>
          <h1 className="font-display text-3xl text-ivory-50">Connexion</h1>
          <p className="mt-2 text-sm text-ivory-100/60">
            Accédez à la liseuse, à vos exemplaires et au Bureau de consultation.
          </p>
        </div>

        <AuthForm mode="login" />

        <p className="mt-6 text-center text-sm text-ivory-100/55">
          Pas encore de compte ?{' '}
          <Link href="/inscription" className="link-underline">
            Créer un compte gratuit
          </Link>
        </p>
      </div>
    </div>
  );
}
