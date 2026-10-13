import { getPillar } from "@/lib/domain/pillars";

interface Props {
  workId: string;
  title: string;
  pillar: string | null;
  coverKey: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  priority?: boolean;
  sizes?: string;
}

/**
 * Couverture : l'image réelle téléversée si disponible ; sinon une reliure typographique
 * (toile bleu nuit, filets or, titre composé) — jamais une fausse couverture illustrée.
 */
export function BookCover({ workId, title, pillar, coverKey, coverWidth, coverHeight, priority, sizes = "(min-width: 64rem) 14rem, 40vw" }: Props) {
  if (coverKey) {
    return (
      <div className="book">
        <span className="book__spine" aria-hidden="true" />
        <img
          className="book__image"
          src={`/api/couvertures/${encodeURIComponent(workId)}`}
          alt={`Couverture de « ${title} »`}
          width={coverWidth ?? 600}
          height={coverHeight ?? 900}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
        />
      </div>
    );
  }
  const p = pillar ? getPillar(pillar) : undefined;
  return (
    <div className="book book--typeset" role="img" aria-label={`Reliure typographique de « ${title} »`}>
      <span className="book__spine" aria-hidden="true" />
      <span className="book__frame" aria-hidden="true">
        <span className="book__pillar">{p ? p.number : ""}</span>
        <span className="book__title">{title}</span>
        <span className="book__rule" />
        <span className="book__author">Dr B. Silas Gbavou</span>
      </span>
    </div>
  );
}
