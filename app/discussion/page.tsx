import type { Metadata } from "next";
import Link from "next/link";
import { PrivateChat } from "@/components/chat/PrivateChat";

export const metadata: Metadata = { title: "Consultation privée", robots: { index: false } };

export default function DiscussionPage() {
  return (
    <div className="section">
      <div className="container container--reading">
        <header className="page-head">
          <p className="kicker">Consultation privée</p>
          <h1>Écrire au ministère</h1>
          <p className="lead">
            Cet échange est distinct du moteur d&apos;étude : il est lu par le ministère, qui vous répond ici lorsqu&apos;il le peut.
            Aucune réponse immédiate n&apos;est garantie.
          </p>
          <p className="subtle">
            La conversation est rattachée à ce navigateur. Si vous effacez vos cookies ou changez d&apos;appareil, elle ne sera plus
            accessible d&apos;ici. <Link href="/confidentialite">Confidentialité</Link>
          </p>
        </header>
        <PrivateChat />
      </div>
    </div>
  );
}
