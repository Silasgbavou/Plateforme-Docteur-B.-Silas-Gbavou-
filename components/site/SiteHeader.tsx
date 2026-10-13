import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { NavLink } from "./NavLink";

export const NAV_ITEMS = [
  { href: "/bibliotheque", label: "Bibliothèque" },
  { href: "/enseignements", label: "Enseignements" },
  { href: "/etude", label: "Étude" },
  { href: "/discussion", label: "Consultation" },
  { href: "/#contact", label: "Contact" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container container--wide site-header__inner">
        <Link href="/" className="wordmark" aria-label="Accueil — Ministère d'Enseignement du Docteur B. Silas Gbavou">
          <span className="wordmark__monogram" aria-hidden="true">BSG</span>
          <span className="wordmark__text">
            <span className="wordmark__name">Dr B. Silas Gbavou</span>
            <span className="wordmark__sub">Ministère d&apos;Enseignement</span>
          </span>
        </Link>
        <nav aria-label="Navigation principale" className="site-nav">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <MobileNav items={NAV_ITEMS.map((i) => ({ href: i.href, label: i.label }))} />
      </div>
    </header>
  );
}
