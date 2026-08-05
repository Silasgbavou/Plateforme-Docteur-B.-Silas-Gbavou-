import type { DailyContent } from '@/lib/daily';

/** Verset du jour et citation du jour, affichés dynamiquement. */
export function DailyPanel({
  verse,
  quote,
  authorName,
}: {
  verse: DailyContent | null;
  quote: DailyContent | null;
  authorName: string;
}) {
  const today = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <article className="surface relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-8 -top-10 font-display text-[120px] leading-none text-gold-300/10">
          ✦
        </div>
        <p className="eyebrow">Verset du jour</p>
        <p className="mt-1 text-[11px] capitalize text-ivory-100/35">{today}</p>
        {verse ? (
          <>
            <blockquote className="mt-4 font-display text-[22px] leading-[1.5] text-ivory-50">
              « {verse.text} »
            </blockquote>
            {verse.reference && (
              <p className="mt-3 text-[13px] font-medium text-gold-200">— {verse.reference}</p>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm text-ivory-100/45">
            Le verset du jour sera publié prochainement.
          </p>
        )}
      </article>

      <article className="surface relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-6 -top-12 font-display text-[130px] leading-none text-ivory-100/5">
          ”
        </div>
        <p className="eyebrow">Citation du jour</p>
        <p className="mt-1 text-[11px] capitalize text-ivory-100/35">{today}</p>
        {quote ? (
          <>
            <blockquote className="mt-4 font-display text-[22px] leading-[1.5] text-ivory-50">
              « {quote.text} »
            </blockquote>
            <p className="mt-3 text-[13px] font-medium text-gold-200">
              — {quote.author || authorName}
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-ivory-100/45">
            La citation du jour sera publiée prochainement.
          </p>
        )}
      </article>
    </div>
  );
}
