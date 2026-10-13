import type { Metadata } from "next";
import Link from "next/link";
import { CONTACTS, WATERMARK } from "@/lib/domain/contacts";
import { generationStatus } from "@/lib/server/llm/registry";

export const metadata: Metadata = { title: "Confidentialité et droits", alternates: { canonical: "/confidentialite" } };

export default function PrivacyPage() {
  const gen = generationStatus();
  return (
    <article className="section">
      <div className="container container--reading prose-page">
        <header className="page-head">
          <p className="kicker">Confidentialité et droits</p>
          <h1>Ce que le site enregistre, et pourquoi</h1>
          <p className="subtle">Version du 13 octobre 2026. Cette page décrit le fonctionnement réel du site ; elle ne constitue pas un avis juridique.</p>
        </header>

        <h2>Demandes d&apos;ouvrages</h2>
        <p>
          Lorsque vous demandez un ouvrage, le ministère enregistre votre nom, prénom, église locale, numéro WhatsApp, email (facultatif),
          motivation, la manière dont vous avez connu le ministère, la date et l&apos;édition exacte reçue. Ces informations sont consultées
          uniquement par l&apos;administrateur du ministère dans son bureau. Elles ne sont ni vendues ni publiées.
        </p>

        <h2>Moteur d&apos;étude</h2>
        <p>
          Vos questions, les réponses et les sources affichées sont enregistrées avec un identifiant pseudonyme lié à votre navigateur.
          Le ministère peut consulter ces échanges pour veiller à la fidélité de l&apos;enseignement. Ce n&apos;est pas un anonymat absolu :
          une question peut contenir des éléments personnels. Vous pouvez effacer votre historique depuis la page{" "}
          <Link href="/etude">Étude</Link> (bouton « Historique » puis « Effacer tout mon historique »).
        </p>
        <p>
          {gen.configured
            ? `Lorsque la synthèse est activée, votre question et les passages retrouvés sont transmis au service d'intelligence artificielle configuré par le ministère (${gen.provider === "gemini" ? "Google Gemini" : "OpenAI"}) pour rédiger la réponse.`
            : "La synthèse automatique n'est pas activée actuellement : vos questions ne sont transmises à aucun service tiers."}{" "}
          L&apos;assistant est un outil documentaire : il n&apos;est pas le Docteur B. Silas Gbavou et ne remplace pas un échange personnel.
        </p>

        <h2>Consultation privée</h2>
        <p>
          Les messages de la <Link href="/discussion">consultation privée</Link> sont lus uniquement par le ministère. Chaque
          conversation est rattachée à votre navigateur par un cookie sécurisé ; aucun autre lecteur ne peut y accéder. Pour demander la
          suppression d&apos;une conversation, écrivez à <a href={CONTACTS.email}>{CONTACTS.emailDisplay}</a>.
        </p>

        <h2>Cookies</h2>
        <p>
          Le site n&apos;utilise ni publicité ni outil de mesure d&apos;audience tiers. Deux cookies techniques peuvent être déposés : un
          identifiant pseudonyme de lecteur (historique d&apos;étude, consultation, demandes d&apos;ouvrages) et, pour l&apos;administrateur
          seulement, un cookie de session. Les vidéos sont intégrées depuis le domaine youtube-nocookie.com.
        </p>

        <h2>Conservation</h2>
        <p>
          La durée de conservation des demandes, messages et échanges d&apos;étude doit être fixée par le ministère ; tant qu&apos;elle ne
          l&apos;est pas, les données sont conservées jusqu&apos;à suppression à votre demande ou par l&apos;administrateur.
        </p>

        <h2>Droits sur les ouvrages</h2>
        <p>
          {WATERMARK}. Les ouvrages sont offerts pour un usage personnel ; leur revente ou diffusion commerciale n&apos;est pas autorisée.
          Le filigrane affiché dans la liseuse est un rappel visible : il ne rend pas un fichier impossible à copier, et le site ne
          prétend pas le contraire. Les fichiers consultés dans la liseuse sont transmis à votre navigateur.
        </p>

        <h2>Application installée et hors ligne</h2>
        <p>
          Le site peut être installé sur votre appareil. Seuls les éléments publics (pages, polices, images) sont gardés en cache ; vos
          conversations, votre historique d&apos;étude et l&apos;espace d&apos;administration ne sont jamais mis en cache.
        </p>
      </div>
    </article>
  );
}
