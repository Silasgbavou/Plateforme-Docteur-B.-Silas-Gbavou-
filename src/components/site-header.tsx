'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PILLARS } from '@/lib/taxonomy';

const NAV = [
  { href: '/enseignement-prophetique', label: 'Prophétique' },
  { href: '/enseignement-spirituel', label: 'Spirituel' },
  { href: '/enseignement-doctrinal', label: 'Doctrinal' },
  { href: '/videos', label: 'Vidéos' },
  { href: '/audios', label: 'Audios' },
  { href: '/livres', label: 'Livres' },
  { href: '/biographie', label: 'Le Docteur' },
];

export function SiteHeader({ user }: { user: { name: string; role: 'MEMBER' | 'ADMIN' } | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled
          ? 'border-white/10 bg-night-950/85 backdrop-blur-xl'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="container-page flex h-[68px] items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-3" aria-label="Accueil">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-600 font-display text-lg font-bold text-night-950 shadow-gold">
            SG
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block font-display text-[17px] font-semibold text-ivory-50">
              Dr B. Silas Gbavou
            </span>
            <span className="block text-[10.5px] uppercase tracking-[0.18em] text-gold-300/80">
              Parole · Prophétique · Doctrine
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-2 text-[13.5px] font-medium transition ${
                  active
                    ? 'bg-white/10 text-gold-200'
                    : 'text-ivory-100/75 hover:bg-white/5 hover:text-ivory-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/assistant" className="btn-ghost hidden !px-4 !py-2 !text-[13px] md:inline-flex">
            <SparkIcon /> Assistant IA
          </Link>
          {user ? (
            <Link
              href={user.role === 'ADMIN' ? '/admin' : '/consultation'}
              className="btn-primary !px-4 !py-2 !text-[13px]"
            >
              {user.role === 'ADMIN' ? 'Administration' : 'Mon espace'}
            </Link>
          ) : (
            <Link href="/connexion" className="btn-primary !px-4 !py-2 !text-[13px]">
              Connexion
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-white/5 lg:hidden"
            aria-expanded={open}
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            <span className="relative block h-3.5 w-5">
              <span
                className={`absolute inset-x-0 top-0 h-0.5 rounded bg-ivory-100 transition ${open ? 'translate-y-1.5 rotate-45' : ''}`}
              />
              <span
                className={`absolute inset-x-0 top-1.5 h-0.5 rounded bg-ivory-100 transition ${open ? 'opacity-0' : ''}`}
              />
              <span
                className={`absolute inset-x-0 top-3 h-0.5 rounded bg-ivory-100 transition ${open ? '-translate-y-1.5 -rotate-45' : ''}`}
              />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-night-950/97 backdrop-blur-xl lg:hidden">
          <nav className="container-page space-y-1 py-4" aria-label="Navigation mobile">
            <p className="eyebrow px-1 pb-2">Les 3 piliers</p>
            {PILLARS.map((pillar) => (
              <Link
                key={pillar.slug}
                href={`/${pillar.slug}`}
                className="block rounded-xl px-3 py-2.5 text-[15px] text-ivory-100/90 hover:bg-white/5"
              >
                {pillar.title}
              </Link>
            ))}
            <p className="eyebrow px-1 pb-2 pt-4">Ressources</p>
            {NAV.slice(3).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-3 py-2.5 text-[15px] text-ivory-100/90 hover:bg-white/5"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/assistant"
              className="block rounded-xl px-3 py-2.5 text-[15px] text-gold-200 hover:bg-white/5"
            >
              Assistant IA pédagogique
            </Link>
            <Link
              href="/consultation"
              className="block rounded-xl px-3 py-2.5 text-[15px] text-ivory-100/90 hover:bg-white/5"
            >
              Bureau de consultation
            </Link>
            <Link
              href="/contact"
              className="block rounded-xl px-3 py-2.5 text-[15px] text-ivory-100/90 hover:bg-white/5"
            >
              Contact
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2zM18.5 14l.9 2.7 2.8.7-2.8.7-.9 2.7-.9-2.7-2.8-.7 2.8-.7.9-2.7z" />
    </svg>
  );
}
