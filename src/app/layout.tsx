import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';

import './globals.css';

import { QuickContact } from '@/components/quick-contact';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getCurrentUser } from '@/lib/auth';
import { SITE } from '@/lib/site';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.shortName}`,
  },
  description: SITE.description,
  applicationName: SITE.ministry,
  authors: [{ name: SITE.name }],
  keywords: [
    'enseignement prophétique',
    'enseignement spirituel',
    'enseignement doctrinal',
    'saine doctrine',
    'mystères de DIEU',
    'sacerdoce en CHRIST',
    'Silas Gbavou',
  ],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: SITE.ministry,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
  },
  twitter: { card: 'summary_large_image' },
  manifest: '/manifest.webmanifest',
  robots: { index: true, follow: true },
  other: {
    copyright: `${SITE.name} — ${SITE.copyright}`,
    rights: SITE.copyright,
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0f1e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh font-sans">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-gold-300 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-night-950"
        >
          Aller au contenu principal
        </a>

        <div className="flex min-h-dvh flex-col">
          <SiteHeader
            user={user ? { name: user.name, role: user.role as 'MEMBER' | 'ADMIN' } : null}
          />
          <main id="contenu" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>

        <QuickContact />
      </body>
    </html>
  );
}
