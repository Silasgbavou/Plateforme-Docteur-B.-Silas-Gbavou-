import Link from "next/link";

export const metadata = { title: "Hors ligne", robots: { index: false } };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="section">
      <div className="container container--reading empty">
        <p className="kicker">Hors ligne</p>
        <h1>Vous n&apos;êtes pas connecté</h1>
        <p className="lead">
          Cette page n&apos;est pas disponible sans connexion. Les pages déjà consultées peuvent rester accessibles. Le moteur
          d&apos;étude et la consultation privée nécessitent une connexion : vos brouillons sont conservés sur cet appareil.
        </p>
        <Link className="btn btn--line" href="/">Revenir à l&apos;accueil</Link>
      </div>
    </div>
  );
}
