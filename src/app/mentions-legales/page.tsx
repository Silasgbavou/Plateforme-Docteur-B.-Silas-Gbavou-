import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/section';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales et politique de confidentialité de la plateforme.',
};

export default function MentionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Informations légales"
        title="Mentions légales et confidentialité"
        description="Éditeur, hébergement, données personnelles et usage de l’intelligence artificielle."
      />

      <div className="container-page py-12">
        <div className="prose-ministry max-w-3xl">
          <h2>Éditeur du site</h2>
          <p>
            {SITE.ministry}
            <br />
            Responsable de la publication : {SITE.name}
            <br />
            Contact : <a href={`mailto:${SITE.email}`}>{SITE.email}</a> — {SITE.phoneDisplay}
          </p>

          <h2>Hébergement</h2>
          <p>
            La plateforme est hébergée par le prestataire d’infrastructure retenu par le ministère.
            Les coordonnées de l’hébergeur sont communiquées sur simple demande à l’adresse de
            contact ci-dessus.
          </p>

          <h2>Données personnelles</h2>
          <p>Les données collectées se limitent à ce qui est nécessaire au fonctionnement :</p>
          <ul>
            <li>
              <strong>Compte</strong> : nom, adresse e-mail, mot de passe chiffré, ville et pays
              facultatifs.
            </li>
            <li>
              <strong>Bureau de consultation</strong> : contenu de vos messages, conservé pour
              assurer le suivi de l’échange.
            </li>
            <li>
              <strong>Téléchargements</strong> : code de licence, date, adresse IP et navigateur —
              nécessaires au dispositif de protection des œuvres.
            </li>
            <li>
              <strong>Assistant IA</strong> : questions posées et réponses produites, conservées pour
              améliorer la pertinence du service.
            </li>
          </ul>
          <p>
            Ces données ne sont ni vendues ni cédées à des tiers à des fins commerciales. Vous pouvez
            demander leur consultation, leur rectification ou leur suppression en écrivant à{' '}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </p>

          <h2>Cookies</h2>
          <p>
            La plateforme utilise un unique cookie technique, strictement nécessaire au maintien de
            votre session de connexion. Aucun cookie publicitaire ni traceur tiers n’est déposé.
          </p>

          <h2>Intelligence artificielle</h2>
          <p>
            L’assistant pédagogique s’appuie sur un modèle de langage exploité via une API. Il répond{' '}
            <strong>exclusivement</strong> à partir des extraits du corpus du Docteur B. Silas Gbavou
            qui lui sont fournis à chaque question. Ses réponses sont un outil d’étude : elles ne
            remplacent ni l’enseignement direct, ni le discernement personnel, ni l’accompagnement
            pastoral.
          </p>

          <h2>Contenus tiers</h2>
          <p>
            Les vidéos sont intégrées depuis YouTube en mode confidentialité renforcée. Leur lecture
            peut entraîner des dépôts par le service tiers, régis par la politique de confidentialité
            de ce dernier.
          </p>

          <h2>Propriété intellectuelle</h2>
          <p>
            Voir la page dédiée :{' '}
            <Link href="/droits-d-auteur">Droits d’auteur et conditions d’utilisation</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
