/** Identité du ministère et coordonnées publiques. */

const rawPhone = process.env.NEXT_PUBLIC_PHONE ?? '+2290167960094';

export const SITE = {
  name: 'Docteur B. Silas Gbavou',
  shortName: 'Dr B. S. Gbavou',
  ministry: 'Ministère du Docteur B. Silas Gbavou',
  titles: [
    'Docteur de la Parole',
    'Docteur de la Saine Doctrine',
    'Homme Prophétique',
    'Formateur au Prophétique',
    'Dispensateur des Mystères de DIEU',
    'Enseignant des Réalités Spirituelles du Sacerdoce en CHRIST',
  ],
  tagline:
    "Hub central des enseignements prophétiques, spirituels et doctrinaux — écrits, audios, vidéos et livres.",
  description:
    "Plateforme officielle du Docteur B. Silas Gbavou : enseignements prophétiques, spirituels et doctrinaux, livres PDF, vidéos, audios et accompagnement pédagogique par intelligence artificielle fondée exclusivement sur son corpus.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  email: process.env.NEXT_PUBLIC_EMAIL ?? 'Silasgbavou@gmail.com',
  /** Numéro affiché tel qu'il est communiqué publiquement. */
  phoneDisplay: '+229 01 67 96 00 94',
  /** Format E.164 pour les liens tel: et wa.me. */
  phoneE164: rawPhone.replace(/[^\d+]/g, ''),
  copyright: 'Tous droits réservés',
} as const;

export const CONTACT_LINKS = {
  whatsapp: `https://wa.me/${SITE.phoneE164.replace('+', '')}`,
  tel: `tel:${SITE.phoneE164}`,
  mail: `mailto:${SITE.email}`,
} as const;

export function whatsappLink(message?: string): string {
  const base = CONTACT_LINKS.whatsapp;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const LEGAL_NOTICE = `© ${new Date().getFullYear()} ${SITE.name} — ${SITE.copyright}. Toute reproduction, diffusion commerciale ou revente, totale ou partielle, est strictement interdite.`;
