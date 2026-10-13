import Link from "next/link";
import { CONTACTS, FOOTER_NOTICE } from "@/lib/domain/contacts";
import { PILLARS } from "@/lib/domain/pillars";
import { ContactList } from "./ContactList";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container container--wide site-footer__grid">
        <div className="site-footer__identity">
          <p className="site-footer__name">{CONTACTS.displayName}</p>
          <p className="site-footer__tagline">Ministère d&apos;Enseignement — livres, enseignements et étude de la Parole.</p>
        </div>
        <nav aria-label="Enseignements" className="site-footer__nav">
          <p className="site-footer__heading">Enseignements</p>
          <ul>
            {PILLARS.map((p) => (
              <li key={p.id}>
                <Link href={`/enseignements/${p.id}`}>{p.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Ressources" className="site-footer__nav">
          <p className="site-footer__heading">Ressources</p>
          <ul>
            <li><Link href="/bibliotheque">Bibliothèque</Link></li>
            <li><Link href="/etude">Moteur d&apos;étude</Link></li>
            <li><Link href="/videos">Prédications</Link></li>
            <li><Link href="/ecrits">Écrits</Link></li>
            <li><Link href="/discussion">Consultation privée</Link></li>
            <li><Link href="/confidentialite">Confidentialité</Link></li>
          </ul>
        </nav>
        <div className="site-footer__contact">
          <p className="site-footer__heading">Contact</p>
          <ContactList compact />
        </div>
      </div>
      <div className="container container--wide site-footer__legal">
        <p>{FOOTER_NOTICE}</p>
      </div>
    </footer>
  );
}
