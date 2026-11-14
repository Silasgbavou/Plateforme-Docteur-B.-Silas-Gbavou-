/** Lisière du pagne : le nom du ministère imprimé en bande, comme sur la lisière d'une étoffe. Décorative (le nom figure déjà dans la page). */
export function Selvedge() {
  const unit = "Ministère d'Enseignement du Docteur B. Silas Gbavou";
  return (
    <div className="selvedge" aria-hidden="true">
      <p>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i}>{unit}</span>
        ))}
      </p>
    </div>
  );
}
