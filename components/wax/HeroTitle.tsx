import { Fragment } from "react";

/**
 * Titre de l'ouverture : chaque mot sort de son masque une seule fois au chargement (entrée Taste :
 * 700 ms par mot, décalage court, ease-out). Le texte reste un seul titre pour les lecteurs d'écran.
 */
export function HeroTitle({ id, text }: { id: string; text: string }) {
  const words = text.split(" ");
  return (
    <h1 id={id} className="fabric-hero__title" aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="mask" aria-hidden="true">
            <span className="mask__w" style={{ "--i": i } as React.CSSProperties}>
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h1>
  );
}
