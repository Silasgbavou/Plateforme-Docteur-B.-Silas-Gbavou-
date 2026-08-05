import type { Metadata } from 'next';

import { PageHero } from '@/components/section';
import { LICENSE_CLAUSES } from '@/lib/pdf';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Droits d’auteur et conditions d’utilisation',
  description:
    'Tous droits réservés — conditions d’utilisation des enseignements et ouvrages du Docteur B. Silas Gbavou.',
};

export default function DroitsPage() {
  const year = new Date().getFullYear();

  return (
    <>
      <PageHero
        eyebrow="Propriété intellectuelle"
        title="Droits d’auteur et conditions d’utilisation"
        description={`© ${year} ${SITE.name}. ${SITE.copyright}.`}
      />

      <div className="container-page py-12">
        <div className="prose-ministry max-w-3xl">
          <h2>1. Titularité des droits</h2>
          <p>
            L’ensemble des contenus publiés sur cette plateforme — enseignements écrits, messages
            audio, vidéos, transcriptions, ouvrages au format PDF, illustrations et éléments
            graphiques — constitue la propriété intellectuelle exclusive du Docteur B. Silas Gbavou.
            Ils sont protégés par le droit d’auteur, notamment par les conventions internationales
            applicables.
          </p>

          <h2>2. Ce qui est autorisé</h2>
          <ul>
            <li>La lecture, l’écoute et le visionnage libres sur la plateforme.</li>
            <li>
              Le téléchargement des ouvrages pour un <strong>usage strictement personnel</strong>{' '}
              d’étude, de méditation et d’édification.
            </li>
            <li>
              La citation d’extraits dans un cadre d’enseignement non commercial, à condition de
              mentionner clairement l’auteur et le titre de l’œuvre.
            </li>
            <li>Le partage des liens de la plateforme.</li>
          </ul>

          <h2>3. Ce qui est interdit</h2>
          <ul>
            <li>
              <strong>Toute revente, location ou monétisation</strong> des ouvrages, enseignements ou
              extraits, sous quelque forme et sur quelque support que ce soit.
            </li>
            <li>
              La rediffusion massive, la remise en ligne sur un autre site, une autre plateforme ou
              un réseau de partage, sans autorisation écrite préalable.
            </li>
            <li>
              La suppression, la modification ou l’altération des filigranes, mentions de licence et
              mentions de copyright.
            </li>
            <li>
              L’utilisation des contenus pour entraîner un système d’intelligence artificielle tiers.
            </li>
            <li>
              Toute attribution erronée, dénaturation du propos ou usage susceptible de porter
              atteinte à l’intégrité de l’enseignement.
            </li>
          </ul>

          <h2>4. Le dispositif de licence nominative</h2>
          <p>
            Le ministère a choisi de laisser les ouvrages téléchargeables, parce que l’édification
            des lecteurs prime. Afin de rendre la revente impraticable sans pénaliser les lecteurs
            honnêtes, chaque téléchargement produit un exemplaire unique et nominatif :
          </p>
          <ul>
            <li>une page de licence en tête du document, au nom du titulaire ;</li>
            <li>un filigrane portant l’adresse e-mail et le code de licence sur chaque page ;</li>
            <li>un pied de page rappelant les droits réservés et l’interdiction de revente ;</li>
            <li>
              une inscription au registre des licences du ministère (code, date, compte, adresse IP).
            </li>
          </ul>
          <p>
            Tout exemplaire retrouvé en vente ou en diffusion non autorisée est donc directement
            rattachable au compte l’ayant obtenu, ce qui engage la responsabilité de son titulaire.
          </p>

          <h2>5. Clauses de la licence personnelle</h2>
          <ul>
            {LICENSE_CLAUSES.map((clause) => (
              <li key={clause}>{clause}</li>
            ))}
          </ul>

          <h2>6. Demandes d’autorisation</h2>
          <p>
            Toute demande de reproduction, de traduction, de diffusion élargie ou de partenariat doit
            être adressée au ministère :{' '}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a> — WhatsApp {SITE.phoneDisplay}. Les
            demandes sérieuses reçoivent une réponse écrite.
          </p>

          <h2>7. Signalement</h2>
          <p>
            Si vous constatez une revente ou une diffusion non autorisée d’un ouvrage, merci de le
            signaler au ministère en indiquant, si possible, le code de licence figurant sur
            l’exemplaire concerné.
          </p>
        </div>
      </div>
    </>
  );
}
