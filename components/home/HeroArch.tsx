import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Arche doctorale. Le portrait officiel est intégré s'il est présent dans /public/portraits
 * (fichier fourni par le ministère, jamais généré). En son absence, l'arche porte le voile
 * soyeux et le monogramme, sans visage de substitution.
 */
export function HeroArch() {
  const hasPortrait = existsSync(path.join(process.cwd(), "public", "portraits", "hero.webp"));
  return (
    <figure className="arch" data-portrait={hasPortrait}>
      <div className="arch__frame">
        <div className="arch__veil" aria-hidden="true" />
        {hasPortrait ? (
          <img
            className="arch__portrait"
            src="/portraits/hero.webp"
            alt="Portrait officiel du Docteur B. Silas Gbavou"
            width={720}
            height={960}
            fetchPriority="high"
            decoding="async"
          />
        ) : (
          <span className="arch__monogram" aria-hidden="true">
            <span>B</span>
            <span className="arch__monogram-dot">·</span>
            <span>S</span>
            <span className="arch__monogram-dot">·</span>
            <span>G</span>
          </span>
        )}
      </div>
      {!hasPortrait ? <figcaption className="visually-hidden">Arche décorative ; portrait officiel non intégré.</figcaption> : null}
    </figure>
  );
}
