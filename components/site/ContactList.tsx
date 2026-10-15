import { CONTACTS } from "@/lib/domain/contacts";
import { FacebookIcon, MailIcon, PhoneIcon, TikTokIcon, WhatsAppIcon } from "@/components/ui/icons";

/** Liens de contact exacts : nom lisible + pictogramme, jamais l'URL brute. */
export function ContactList({ compact = false }: { compact?: boolean }) {
  const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
  return (
    <ul className={`contact-list${compact ? " contact-list--compact" : ""}`}>
      <li>
        <a href={CONTACTS.facebook} {...ext}>
          <FacebookIcon size={18} />
          <span>{CONTACTS.displayName}<span className="visually-hidden"> sur Facebook (nouvel onglet)</span></span>
        </a>
      </li>
      <li>
        <a href={CONTACTS.tiktok} {...ext}>
          <TikTokIcon size={18} />
          <span>{CONTACTS.displayName}<span className="visually-hidden"> sur TikTok (nouvel onglet)</span></span>
        </a>
      </li>
      <li>
        <a href={CONTACTS.whatsapp} {...ext}>
          <WhatsAppIcon size={18} />
          <span><span className="visually-hidden">WhatsApp : </span>{CONTACTS.whatsappDisplay}</span>
        </a>
      </li>
      <li>
        <a href={CONTACTS.tel}>
          <PhoneIcon size={18} />
          <span><span className="visually-hidden">Appeler le </span>{CONTACTS.whatsappDisplay}</span>
        </a>
      </li>
      <li>
        <a href={CONTACTS.email}>
          <MailIcon size={18} />
          <span><span className="visually-hidden">Écrire à </span>{CONTACTS.emailDisplay}</span>
        </a>
      </li>
    </ul>
  );
}
