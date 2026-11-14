/** Rendu sûr d'un texte de réponse : paragraphes + références [Sx] cliquables. Aucun HTML interprété. */
export function AnswerText({ text, anchorPrefix }: { text: string; anchorPrefix: string }) {
  const paragraphs = text.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i}>
          {p.split(/(\[S\d{1,2}\])/g).map((part, j) => {
            const m = /^\[(S\d{1,2})\]$/.exec(part);
            if (!m) return part;
            return (
              <a key={j} className="ref" href={`#${anchorPrefix}-${m[1]}`} aria-label={`source ${m[1]}`}>
                {m[1]}
              </a>
            );
          })}
        </p>
      ))}
    </>
  );
}
