import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Fenêtre de la nef : l'arche doctorale traitée comme une baie éclairée (meneau et imposte dorés),
 * traversée par la lumière céleste et ambrée des voiles. Le portrait officiel y prend place
 * s'il est fourni dans /public/portraits (jamais de visage généré).
 */
export function HeroArch() {
  const hasPortrait = existsSync(path.join(process.cwd(), "public", "portraits", "hero.webp"));
  return (
    <figure className="window" data-portrait={hasPortrait}>
      <div className="window__bay">
        <div className="window__light" aria-hidden="true" />
        {hasPortrait ? (
          <img
            className="window__portrait"
            src="/portraits/hero.webp"
            alt="Portrait officiel du Docteur B. Silas Gbavou"
            width={720}
            height={960}
            fetchPriority="high"
            decoding="async"
          />
        ) : (
          <svg className="window__tracery" viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
            <path d="M150 0 V420" />
            <path d="M0 150 H300" />
            <path d="M32 150 A118 118 0 0 1 268 150" />
          </svg>
        )}
      </div>
      <figcaption className="visually-hidden">
        {hasPortrait ? "Portrait du Docteur B. Silas Gbavou dans l'arche du ministère." : "Arche lumineuse, emblème du ministère."}
      </figcaption>
    </figure>
  );
}
