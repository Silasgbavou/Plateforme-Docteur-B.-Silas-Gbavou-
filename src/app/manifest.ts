import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/site';

/**
 * Manifeste PWA — la plateforme est installable sur mobile dès la mise en
 * ligne, et sert de base à la déclinaison en application native (le même
 * back-end HTTP alimente une future application React Native / Capacitor).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — ${SITE.tagline}`,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0f1e',
    theme_color: '#0a0f1e',
    lang: 'fr',
    dir: 'ltr',
    categories: ['education', 'books', 'lifestyle'],
    icons: [
      { src: '/icone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Assistant IA', url: '/assistant' },
      { name: 'Vidéos', url: '/videos' },
      { name: 'Livres', url: '/livres' },
      { name: 'Bureau de consultation', url: '/consultation' },
    ],
  };
}
