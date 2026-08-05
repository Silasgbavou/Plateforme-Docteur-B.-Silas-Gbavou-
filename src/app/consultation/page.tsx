import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ConsultationDesk } from '@/components/consultation-desk';
import { PageHero } from '@/components/section';
import { getCurrentUser } from '@/lib/auth';
import { SITE, whatsappLink } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Bureau de consultation',
  description:
    'Espace de messagerie privé pour poser vos questions au Docteur B. Silas Gbavou.',
};

export const dynamic = 'force-dynamic';

export default async function ConsultationPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');

  return (
    <>
      <PageHero
        eyebrow="Bureau de consultation"
        title={`Shalom ${user.name.split(' ')[0]}`}
        description="Votre espace de messagerie privé avec le ministère. Posez vos questions ; les échanges restent confidentiels et conservés dans votre historique."
      >
        <div className="flex flex-wrap gap-3">
          <a
            href={whatsappLink('Shalom Docteur, je vous écris depuis la plateforme.')}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
          >
            WhatsApp {SITE.phoneDisplay}
          </a>
          <a href={`mailto:${SITE.email}`} className="btn-ghost">
            {SITE.email}
          </a>
        </div>
      </PageHero>

      <div className="container-page py-10">
        <ConsultationDesk admin={user.role === 'ADMIN'} />

        <p className="mt-8 text-center text-[12px] text-ivory-100/40">
          Pour les questions d’étude sur les enseignements, l’assistant IA répond immédiatement,
          24 h/24, sur la base du corpus du Docteur.
        </p>
      </div>
    </>
  );
}
