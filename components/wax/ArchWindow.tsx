import { existsSync } from "node:fs";
import path from "node:path";
import { ArchMark } from "./ArchMark";

/**
 * Fenêtre en arche doctorale taillée dans l'étoffe du pagne. Elle accueille la photographie officielle
 * fournie par le ministère (public/portraits/docteur.webp) ; tant qu'elle n'existe pas, l'étoffe porte
 * l'emblème de l'arche. Aucun visage n'est jamais généré.
 */
export function ArchWindow({ file = "docteur.webp", alt = "Le Docteur B. Silas Gbavou" }: { file?: string; alt?: string }) {
  const hasPhoto = existsSync(path.join(process.cwd(), "public", "portraits", file));
  return (
    <div className="arch-window">
      {hasPhoto ? (
        <img src={`/portraits/${file}`} alt={alt} width={720} height={900} loading="lazy" decoding="async" data-source="client" />
      ) : (
        <ArchMark size={96} className="arch-window__emblem" title="Emblème du ministère" />
      )}
    </div>
  );
}
