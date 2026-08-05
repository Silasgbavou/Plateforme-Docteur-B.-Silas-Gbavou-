import type { Metadata } from 'next';
import Link from 'next/link';

import { AiAssistant } from '@/components/ai-assistant';
import { PageHero } from '@/components/section';
import { corpusStats } from '@/lib/queries';
import { PILLARS } from '@/lib/taxonomy';

export const metadata: Metadata = {
  title: 'Assistant IA pédagogique',
  description:
    'Interrogez l’ensemble du corpus du Docteur B. Silas Gbavou : synthèses, explications et parcours d’étude, fondés exclusivement sur ses enseignements.',
};

export const revalidate = 600;

export default async function AssistantPage() {
  const stats = await corpusStats();

  return (
    <>
      <PageHero
        eyebrow="Intelligence artificielle pédagogique"
        title="Le Serviteur — votre assistant d’étude"
        description="Un accompagnement pédagogique fondé exclusivement sur le corpus du Docteur B. Silas Gbavou : enseignements écrits, transcriptions de vidéos, audios et ouvrages. L’assistant ne puise dans aucune source extérieure et cite systématiquement ses références."
      />

      <div className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
          <AiAssistant
            title="Poser une question au corpus"
            contextLabel={`Base d’étude : ${stats.chunks} fragments indexés issus de ${
              stats.videos + stats.audios + stats.articles + stats.books
            } enseignements.`}
            suggestions={[
              'Qu’enseigne le Docteur sur le discernement des esprits ?',
              'Fais une synthèse de la doctrine du sacerdoce en CHRIST.',
              'Propose-moi un parcours d’étude de 30 jours sur la prière.',
              'Quelle différence entre vision et songe selon les enseignements ?',
            ]}
          />

          <aside className="space-y-5">
            <div className="surface p-5">
              <p className="eyebrow mb-3">Ce que fait l’assistant</p>
              <ul className="space-y-2.5 text-[13.5px] leading-relaxed text-ivory-100/70">
                {[
                  'Répondre à vos questions sur les enseignements',
                  'Produire résumés et synthèses fidèles',
                  'Bâtir un parcours d’étude progressif',
                  'Situer chaque réponse dans les 3 piliers',
                  'Citer les enseignements sources',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="mt-0.5 text-gold-300/80">✦</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="surface p-5">
              <p className="eyebrow mb-3">Ses limites, assumées</p>
              <ul className="space-y-2.5 text-[13.5px] leading-relaxed text-ivory-100/60">
                <li>Il ne répond qu’à partir du corpus publié. Hors corpus, il le dit.</li>
                <li>Il ne prophétise pas et ne délivre aucune parole personnelle.</li>
                <li>
                  Pour une situation personnelle, écrivez au{' '}
                  <Link href="/consultation" className="text-gold-300/85 hover:text-gold-200">
                    Bureau de consultation
                  </Link>
                  .
                </li>
              </ul>
            </div>

            <div className="surface p-5">
              <p className="eyebrow mb-3">Explorer par rubrique</p>
              <ul className="space-y-1.5 text-[14px]">
                {PILLARS.map((pillar) => (
                  <li key={pillar.slug}>
                    <Link
                      href={`/${pillar.slug}`}
                      className="block rounded-lg px-2 py-1.5 text-ivory-100/75 transition hover:bg-white/5 hover:text-gold-200"
                    >
                      {pillar.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
