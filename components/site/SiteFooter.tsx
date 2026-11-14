import Link from "next/link";
import { CONTACTS, FOOTER_NOTICE } from "@/lib/domain/contacts";
import { PILLARS } from "@/lib/domain/pillars";
import { ContactList } from "./ContactList";
import { Selvedge } from "@/components/wax/Selvedge";
import { WhatsAppIcon } from "@/components/ui/icons";

export function SiteFooter() {
  return (
    <footer className="closing" id="contact">
      <Selvedge />
      <div className="container container--wide wrap closing__close">
        <div>
          <h2 className="closing__title">Écrire au ministère</h2>
          <p className="closing__lead">
            Pour une question personnelle, le ministère répond sur WhatsApp ou dans la consultation privée, distincte du moteur
            d&apos;étude.
          </p>
        </div>
        <div className="closing__actions">
          <a className="btn btn--gold" href={CONTACTS.whatsapp} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon size={18} /> Écrire sur WhatsApp
          </a>
          <Link className="btn btn--cloth" href="/discussion">Ouvrir une consultation privée</Link>
        </div>
      </div>
      <div className="container container--wide wrap closing__grid">
        <nav aria-label="Enseignements" className="closing__nav">
          <h3 className="closing__heading">Enseignements</h3>
          <ul>
            {PILLARS.map((p) => (
              <li key={p.id}><Link href={`/enseignements/${p.id}`}>{p.label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Ressources" className="closing__nav">
          <h3 className="closing__heading">Ressources</h3>
          <ul>
            <li><Link href="/bibliotheque">Bibliothèque</Link></li>
            <li><Link href="/etude">Moteur d&apos;étude</Link></li>
            <li><Link href="/videos">Prédications</Link></li>
            <li><Link href="/ecrits">Écrits</Link></li>
            <li><Link href="/confidentialite">Confidentialité</Link></li>
          </ul>
        </nav>
        <div className="closing__contact">
          <h3 className="closing__heading">Contact</h3>
          <ContactList compact />
        </div>
      </div>
      <div className="container container--wide wrap closing__legal">
        <p>{FOOTER_NOTICE}</p>
      </div>
    </footer>
  );
}
