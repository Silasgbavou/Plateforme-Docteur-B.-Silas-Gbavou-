import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { NavLink } from "./NavLink";
import { ArchMark } from "@/components/wax/ArchMark";

export const NAV_ITEMS = [
  { href: "/bibliotheque", label: "Bibliothèque" },
  { href: "/enseignements", label: "Enseignements" },
  { href: "/etude", label: "Étude" },
  { href: "/discussion", label: "Consultation" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container container--wide wrap site-header__inner">
        <a className="skip-link" href="#contenu">Aller au contenu</a>
        <Link href="/" className="wordmark" aria-label="Accueil, Ministère d'Enseignement du Docteur B. Silas Gbavou">
          <ArchMark size={26} className="wordmark__mark" />
          <span className="wordmark__name" translate="no">Dr B. Silas Gbavou</span>
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
        <Link href="/bibliotheque" className="btn btn--gold btn--nav">Recevoir un livre</Link>
        <MobileNav items={[...NAV_ITEMS.map((i) => ({ href: i.href, label: i.label })), { href: "/bibliotheque", label: "Recevoir un livre" }]} />
      </div>
    </header>
  );
}
