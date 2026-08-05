import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth-form';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Créer un compte' };
export const dynamic = 'force-dynamic';

export default async function InscriptionPage() {
  const user = await getCurrentUser();
  if (user) redirect('/consultation');

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="eyebrow mb-2">Rejoindre la plateforme</p>
          <h1 className="font-display text-3xl text-ivory-50">Créer mon compte</h1>
          <p className="mt-2 text-sm text-ivory-100/60">
            Gratuit. Nécessaire pour la lecture des ouvrages et le Bureau de consultation.
          </p>
        </div>

        <AuthForm mode="signup" />

        <p className="mt-6 text-center text-sm text-ivory-100/55">
          Vous avez déjà un compte ?{' '}
          <Link href="/connexion" className="link-underline">
            Me connecter
          </Link>
        </p>

        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-ivory-100/35">
          En créant un compte, vous acceptez que vos exemplaires de livres soient nominatifs et que
          toute revente ou rediffusion soit interdite.{' '}
          <Link href="/droits-d-auteur" className="text-gold-300/70 hover:text-gold-200">
            Conditions
          </Link>
        </p>
      </div>
    </div>
  );
}
