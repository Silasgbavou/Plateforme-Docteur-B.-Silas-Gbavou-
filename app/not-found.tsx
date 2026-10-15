import Link from "next/link";

export default function NotFound() {
  return (
    <div className="section">
      <div className="container container--reading empty">
        <h1>Cette page n&apos;existe pas ou n&apos;est plus publiée</h1>
        <div className="actions">
          <Link className="btn btn--solid" href="/bibliotheque">La bibliothèque</Link>
          <Link className="btn btn--line" href="/">Accueil</Link>
        </div>
      </div>
    </div>
  );
}
