import Link from 'next/link';

import { PILLARS } from '@/lib/taxonomy';

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-20 text-center">
      <div className="max-w-lg">
        <p className="eyebrow mb-3">Page introuvable</p>
        <h1 className="font-display text-5xl text-ivory-50">404</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ivory-100/65">
          Cette page n’existe pas ou a été déplacée. Reprenez par l’une des trois grandes rubriques.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {PILLARS.map((pillar) => (
            <Link key={pillar.slug} href={`/${pillar.slug}`} className="btn-ghost !text-[13px]">
              {pillar.title.replace("L'Enseignement ", '')}
            </Link>
          ))}
        </div>

        <div className="mt-6">
          <Link href="/" className="btn-primary">
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
