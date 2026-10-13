"use client";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="section">
      <div className="container container--reading empty" role="alert">
        <p className="kicker">Erreur</p>
        <h1>Une erreur est survenue</h1>
        <p className="muted">La page n&apos;a pas pu être affichée.{error.digest ? ` Référence : ${error.digest}.` : ""}</p>
        <div className="actions">
          <button type="button" className="btn btn--solid" onClick={reset}>Réessayer</button>
          <Link className="btn btn--line" href="/">Accueil</Link>
        </div>
      </div>
    </div>
  );
}
