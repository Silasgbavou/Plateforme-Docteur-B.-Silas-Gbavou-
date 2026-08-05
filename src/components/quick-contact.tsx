'use client';

import { useState } from 'react';

import { CONTACT_LINKS, SITE, whatsappLink } from '@/lib/site';

/**
 * Boutons de contact rapides, présents sur toutes les pages :
 * WhatsApp (+229 01 67 96 00 94), appel direct et e-mail.
 */
export function QuickContact() {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      detail: SITE.phoneDisplay,
      href: whatsappLink(
        `Shalom Docteur B. Silas Gbavou. Je vous écris depuis la plateforme du ministère.`,
      ),
      external: true,
      className: 'bg-[#25D366] text-[#052e16]',
      icon: <WhatsAppIcon />,
    },
    {
      key: 'tel',
      label: 'Appeler',
      detail: SITE.phoneDisplay,
      href: CONTACT_LINKS.tel,
      external: false,
      className: 'bg-gradient-to-br from-gold-300 to-gold-500 text-night-950',
      icon: <PhoneIcon />,
    },
    {
      key: 'mail',
      label: 'E-mail',
      detail: SITE.email,
      href: CONTACT_LINKS.mail,
      external: false,
      className: 'bg-night-800 text-ivory-100 border border-white/15',
      icon: <MailIcon />,
    },
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50 print-protected flex flex-col items-end gap-3">
      {open && (
        <ul className="flex flex-col items-end gap-2.5">
          {actions.map((action) => (
            <li key={action.key} className="animate-fade-up">
              <a
                href={action.href}
                target={action.external ? '_blank' : undefined}
                rel={action.external ? 'noreferrer' : undefined}
                className="group flex items-center gap-3"
              >
                <span className="rounded-lg border border-white/12 bg-night-900/95 px-3 py-1.5 text-right shadow-elevated backdrop-blur">
                  <span className="block text-[13px] font-semibold text-ivory-50">
                    {action.label}
                  </span>
                  <span className="block text-[11px] text-ivory-100/55">{action.detail}</span>
                </span>
                <span
                  className={`grid h-11 w-11 place-items-center rounded-full shadow-elevated transition group-hover:scale-105 ${action.className}`}
                >
                  {action.icon}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Fermer les contacts rapides' : 'Ouvrir les contacts rapides'}
        className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 text-night-950 shadow-gold transition hover:scale-105"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.86 9.86 0 004.76 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.2 2.2z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm9 7.2L4.6 7H19.4L12 12.2zM4 8.9V17h16V8.9l-7.4 5.2a1 1 0 01-1.2 0L4 8.9z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3c5 0 9 3.4 9 7.6 0 4.2-4 7.6-9 7.6-.9 0-1.8-.1-2.6-.3L4 20l1.2-3.3C3.8 15.3 3 13.1 3 10.6 3 6.4 7 3 12 3z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
