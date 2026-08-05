import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const base = SITE.url.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Les flux protégés et les espaces privés ne sont jamais explorés.
        disallow: ['/api/', '/admin', '/consultation', '/connexion', '/inscription'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
