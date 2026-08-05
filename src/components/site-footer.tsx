import Link from 'next/link';

import { CONTACT_LINKS, SITE } from '@/lib/site';
import { PILLARS } from '@/lib/taxonomy';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-white/10 bg-night-950/80">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-600 font-display text-lg font-bold text-night-950">
              SG
            </span>
            <div>
              <p className="font-display text-lg text-ivory-50">{SITE.name}</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-gold-300/80">
                Docteur de la Parole et de la Saine Doctrine
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ivory-100/60">{SITE.tagline}</p>
          <ul className="mt-5 space-y-1.5 text-sm text-ivory-100/70">
            <li>
              <a className="link-underline" href={CONTACT_LINKS.whatsapp} target="_blank" rel="noreferrer">
                WhatsApp {SITE.phoneDisplay}
              </a>
            </li>
            <li>
              <a className="link-underline" href={CONTACT_LINKS.tel}>
                Appel direct {SITE.phoneDisplay}
              </a>
            </li>
            <li>
              <a className="link-underline" href={CONTACT_LINKS.mail}>
                {SITE.email}
              </a>
            </li>
          </ul>
        </div>

        <FooterColumn title="Les 3 piliers">
          {PILLARS.map((pillar) => (
            <FooterLink key={pillar.slug} href={`/${pillar.slug}`}>
              {pillar.title}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Ressources">
          <FooterLink href="/videos">Vidéos</FooterLink>
          <FooterLink href="/audios">Audios</FooterLink>
          <FooterLink href="/ecrits">Enseignements écrits</FooterLink>
          <FooterLink href="/livres">Livres PDF</FooterLink>
          <FooterLink href="/assistant">Assistant IA</FooterLink>
        </FooterColumn>

        <FooterColumn title="Le ministère">
          <FooterLink href="/biographie">Biographie</FooterLink>
          <FooterLink href="/consultation">Bureau de consultation</FooterLink>
          <FooterLink href="/contact">Contact</FooterLink>
          <FooterLink href="/mentions-legales">Mentions légales</FooterLink>
          <FooterLink href="/droits-d-auteur">Droits d’auteur</FooterLink>
        </FooterColumn>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ivory-100/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {SITE.name}. <span className="text-gold-300/80">{SITE.copyright}.</span>
          </p>
          <p className="max-w-xl sm:text-right">
            Toute reproduction, diffusion commerciale ou revente, totale ou partielle, des
            enseignements et ouvrages est strictement interdite.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-4">{title}</p>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-ivory-100/65 transition hover:text-gold-200">
        {children}
      </Link>
    </li>
  );
}
