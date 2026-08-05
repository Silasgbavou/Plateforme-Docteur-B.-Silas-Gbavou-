import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/section';
import { corpusStats } from '@/lib/queries';
import { SITE, whatsappLink } from '@/lib/site';
import { PILLARS } from '@/lib/taxonomy';

export const metadata: Metadata = {
  title: 'Le Docteur B. Silas Gbavou',
  description:
    'Biographie et vision du ministère du Docteur B. Silas Gbavou : Docteur de la Parole et de la Saine Doctrine, Homme Prophétique, Formateur au Prophétique.',
};

export const revalidate = 3600;

export default async function BiographiePage() {
  const stats = await corpusStats();

  return (
    <>
      <PageHero
        eyebrow="Le serviteur de DIEU"
        title="Docteur B. Silas Gbavou"
        description="Docteur de la Parole et de la Saine Doctrine, Homme Prophétique, Formateur au Prophétique, Dispensateur des Mystères de DIEU et des Réalités Spirituelles du Sacerdoce en CHRIST."
      >
        <ul className="flex flex-wrap gap-2">
          {SITE.titles.map((title) => (
            <li key={title} className="badge">
              {title}
            </li>
          ))}
        </ul>
      </PageHero>

      <div className="container-page py-14">
        <div className="grid gap-12 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="prose-ministry max-w-3xl">
            <h2>Une vocation : dispenser la Parole avec exactitude</h2>
            <p>
              Le ministère du Docteur B. Silas Gbavou s’enracine dans une conviction simple et
              exigeante : la Parole de DIEU mérite d’être enseignée avec rigueur, dispensée avec
              ordre, et reçue dans la crainte du SEIGNEUR. Il ne s’agit ni d’émotion passagère ni de
              curiosité spirituelle, mais d’édification durable — celle qui affermit les fondements
              du croyant et forme des serviteurs éprouvés.
            </p>

            <h2>Trois dimensions inséparables</h2>
            <p>
              L’enseignement du Docteur se déploie selon trois axes que la plateforme reprend
              comme architecture fondamentale. Ces trois piliers ne sont pas des catégories
              administratives : ils reflètent la manière dont la révélation, la vie intérieure et la
              doctrine se tiennent ensemble dans l’Écriture.
            </p>
            <ul>
              {PILLARS.map((pillar) => (
                <li key={pillar.slug}>
                  <strong>{pillar.title}</strong> — {pillar.tagline}.
                </li>
              ))}
            </ul>

            <h2>Le prophétique, sous la discipline de la doctrine</h2>
            <p>
              Formateur au prophétique, le Docteur enseigne que le don ne dispense jamais du
              caractère, et que la révélation ne s’oppose jamais à l’Écriture : elle s’y soumet. Sa
              formation s’adresse à ceux qui veulent servir dans la durée — apprendre à entendre,
              apprendre à éprouver, apprendre à se taire, apprendre à rendre le message avec
              justesse.
            </p>

            <h2>Les mystères de DIEU et le sacerdoce en CHRIST</h2>
            <p>
              Dispensateur des mystères de DIEU, il conduit ses auditeurs dans les réalités
              spirituelles du sacerdoce en CHRIST : l’autel, le service, l’onction, la sanctification
              du vase. Là encore, l’exigence demeure la même — rien qui ne soit fondé, rien qui ne
              soit vérifiable dans la saine doctrine.
            </p>

            <h2>Une plateforme au service de l’enseignement</h2>
            <p>
              Ce site rassemble l’ensemble du corpus : enseignements écrits, messages audios,
              vidéos et ouvrages. Un assistant d’intelligence artificielle, fondé{' '}
              <strong>exclusivement</strong> sur ces enseignements, accompagne chaque internaute dans
              son étude : il répond, résume, synthétise et propose des parcours — sans jamais
              ajouter quoi que ce soit d’extérieur au corpus.
            </p>

            <blockquote>
              L’objectif n’est pas de multiplier les contenus, mais de former des croyants
              enracinés, capables de discerner, d’enseigner à leur tour et de tenir ferme.
            </blockquote>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="surface p-6">
              <p className="eyebrow mb-4">Le corpus en chiffres</p>
              <dl className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Vidéos', value: stats.videos },
                  { label: 'Audios', value: stats.audios },
                  { label: 'Écrits', value: stats.articles },
                  { label: 'Livres', value: stats.books },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-[11px] uppercase tracking-wider text-ivory-100/45">
                      {item.label}
                    </dt>
                    <dd className="mt-0.5 font-display text-2xl text-gold-200">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="surface p-6">
              <p className="eyebrow mb-4">Entrer en contact</p>
              <div className="space-y-2.5 text-sm">
                <a
                  href={whatsappLink('Shalom Docteur, je vous écris depuis la plateforme.')}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-ivory-100/75 transition hover:text-gold-200"
                >
                  WhatsApp — {SITE.phoneDisplay}
                </a>
                <a
                  href={`tel:${SITE.phoneE164}`}
                  className="block text-ivory-100/75 transition hover:text-gold-200"
                >
                  Appel direct — {SITE.phoneDisplay}
                </a>
                <a
                  href={`mailto:${SITE.email}`}
                  className="block text-ivory-100/75 transition hover:text-gold-200"
                >
                  {SITE.email}
                </a>
                <Link
                  href="/consultation"
                  className="block text-gold-200 transition hover:text-gold-100"
                >
                  Bureau de consultation →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
