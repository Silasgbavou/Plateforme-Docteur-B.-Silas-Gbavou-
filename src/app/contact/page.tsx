import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/section';
import { SITE, whatsappLink } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Contacter le ministère du Docteur B. Silas Gbavou : WhatsApp ${SITE.phoneDisplay}, appel direct ou e-mail.`,
};

export default function ContactPage() {
  const channels = [
    {
      title: 'WhatsApp',
      detail: SITE.phoneDisplay,
      description: 'Le canal le plus rapide pour joindre le ministère.',
      href: whatsappLink('Shalom Docteur B. Silas Gbavou, je vous écris depuis la plateforme.'),
      external: true,
      cta: 'Ouvrir WhatsApp',
      accent: 'from-[#25D366]/25 to-transparent border-[#25D366]/30',
    },
    {
      title: 'Appel direct',
      detail: SITE.phoneDisplay,
      description: 'Appelez directement le numéro du ministère.',
      href: `tel:${SITE.phoneE164}`,
      external: false,
      cta: 'Appeler maintenant',
      accent: 'from-gold-300/20 to-transparent border-gold-300/30',
    },
    {
      title: 'E-mail',
      detail: SITE.email,
      description: 'Pour les échanges détaillés, invitations et partenariats.',
      href: `mailto:${SITE.email}`,
      external: false,
      cta: 'Écrire un e-mail',
      accent: 'from-white/10 to-transparent border-white/15',
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Nous joindre"
        title="Contacter le ministère"
        description="Trois canaux directs, plus un espace de messagerie privé pour les questions qui demandent un suivi."
      />

      <div className="container-page py-12">
        <div className="grid gap-5 md:grid-cols-3">
          {channels.map((channel) => (
            <a
              key={channel.title}
              href={channel.href}
              target={channel.external ? '_blank' : undefined}
              rel={channel.external ? 'noreferrer' : undefined}
              className={`group rounded-2xl border bg-gradient-to-b p-6 transition hover:-translate-y-1 hover:shadow-elevated ${channel.accent}`}
            >
              <p className="eyebrow">{channel.title}</p>
              <p className="mt-3 font-display text-[22px] text-ivory-50">{channel.detail}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ivory-100/60">
                {channel.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-gold-200">
                {channel.cta}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="transition group-hover:translate-x-1">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </a>
          ))}
        </div>

        <div className="surface-strong mt-10 grid gap-6 p-8 md:grid-cols-2 md:items-center">
          <div>
            <p className="eyebrow mb-3">Suivi personnalisé</p>
            <h2 className="font-display text-2xl text-ivory-50">Bureau de consultation</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ivory-100/65">
              Un espace de messagerie privé, interne au site. Vos échanges y sont conservés et
              retrouvables, contrairement à une conversation qui se perd dans un fil.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link href="/consultation" className="btn-primary">
              Ouvrir une consultation
            </Link>
            <Link href="/assistant" className="btn-ghost">
              Question d’étude ? Assistant IA
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
