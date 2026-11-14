import { existsSync } from "node:fs";
import path from "node:path";
import { ArchMark } from "./ArchMark";

/**
 * Médaillon du pagne commémoratif : cercles d'or concentriques autour du portrait officiel.
 * Le portrait n'apparaît que s'il est fourni par le ministère (public/portraits/hero.webp) ;
 * sinon le médaillon porte l'emblème de l'arche. Aucun visage n'est jamais généré.
 */
export function Medallion({ priority = false }: { priority?: boolean }) {
  const hasPortrait = existsSync(path.join(process.cwd(), "public", "portraits", "hero.webp"));
  return (
    <div className="medallion" data-enter-media>
      <svg className="medallion__rings" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
        <circle cx="200" cy="200" r="196" />
        <circle cx="200" cy="200" r="184" className="medallion__dots" />
        <circle cx="200" cy="200" r="172" />
      </svg>
      <div className="medallion__face">
        {hasPortrait ? (
          <img
            src="/portraits/hero.webp"
            alt="Le Docteur B. Silas Gbavou"
            width={640}
            height={640}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            data-source="client"
          />
        ) : (
          <ArchMark size={120} className="medallion__emblem" title="Emblème du ministère" />
        )}
      </div>
    </div>
  );
}
