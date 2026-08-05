'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Liseuse PDF protégée.
 *
 * Le flux provient d'une route API qui vérifie la session ; le fichier n'est
 * jamais exposé en statique. Les dissuasions côté client (menu contextuel,
 * glisser-déposer, impression, raccourcis de sauvegarde) réduisent la copie
 * opportuniste. La protection réellement opposable reste la licence nominative
 * inscrite dans chaque exemplaire téléchargé.
 */
export function PdfReader({
  contentId,
  title,
  canRead,
}: {
  contentId: string;
  title: string;
  canRead: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;

    const block = (event: Event) => event.preventDefault();
    node.addEventListener('contextmenu', block);
    node.addEventListener('dragstart', block);

    const onKeyDown = (event: KeyboardEvent) => {
      const combo = (event.ctrlKey || event.metaKey) && ['s', 'p'].includes(event.key.toLowerCase());
      if (combo) {
        event.preventDefault();
        window.alert(
          "Impression et enregistrement désactivés dans la liseuse. Utilisez le bouton « Télécharger mon exemplaire » : il génère une copie nominative sous licence personnelle.",
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      node.removeEventListener('contextmenu', block);
      node.removeEventListener('dragstart', block);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  if (!canRead) {
    return (
      <div className="surface grid place-items-center px-6 py-20 text-center">
        <div className="max-w-md">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-gold-300/15 text-gold-200">
            <LockIcon />
          </span>
          <h3 className="font-display text-xl text-ivory-50">Lecture réservée aux membres</h3>
          <p className="mt-2 text-sm leading-relaxed text-ivory-100/60">
            Créez un compte gratuit pour accéder à la liseuse et obtenir votre exemplaire nominatif.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a href="/inscription" className="btn-primary">
              Créer mon compte
            </a>
            <a href="/connexion" className="btn-ghost">
              Me connecter
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={frameRef}
      className={`no-select relative overflow-hidden rounded-2xl border border-white/10 bg-night-900 ${
        expanded ? 'h-[85vh]' : 'h-[70vh]'
      }`}
    >
      <object
        data={`/api/livres/${contentId}/lecture#toolbar=0&navpanes=0&statusbar=0&view=FitH`}
        type="application/pdf"
        className="h-full w-full"
        aria-label={`Liseuse : ${title}`}
      >
        <div className="grid h-full place-items-center px-6 text-center">
          <p className="text-sm text-ivory-100/60">
            Votre navigateur n’affiche pas les PDF en ligne.
            <br />
            <a
              href={`/api/livres/${contentId}/lecture`}
              className="link-underline"
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir la liseuse dans un nouvel onglet
            </a>
          </p>
        </div>
      </object>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-night-950 to-transparent px-4 pb-3 pt-8 text-[11px] text-ivory-100/55">
        <span>© {new Date().getFullYear()} Dr B. Silas Gbavou — Tous droits réservés</span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="pointer-events-auto rounded-lg border border-white/15 bg-night-900/80 px-2.5 py-1 backdrop-blur transition hover:border-gold-300/40 hover:text-gold-200"
        >
          {expanded ? 'Réduire' : 'Agrandir'}
        </button>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a5 5 0 015 5v3h1a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2h1V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v3h6V7a3 3 0 00-3-3z" />
    </svg>
  );
}
