import type { Metadata } from 'next';

import { LibraryPage } from '@/components/library-page';

export const metadata: Metadata = {
  title: 'Enseignements écrits',
  description:
    'Articles, notes et enseignements rédigés du Docteur B. Silas Gbavou, structurés selon la règle des trois piliers.',
};

export const revalidate = 300;

export default async function EcritsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pilier?: string }>;
}) {
  const params = await searchParams;
  return (
    <LibraryPage
      type="ARTICLE"
      eyebrow="Espace enseignements écrits"
      title="Les enseignements rédigés"
      description="Une base structurée d’articles et de notes doctrinales, ordonnée selon les trois grandes rubriques : Prophétique, Spirituel, Doctrinal."
      searchParams={params}
      assistantTitle="Assistant — corpus écrit"
      suggestions={[
        'Quels écrits traitent de la saine doctrine ?',
        'Fais-moi une synthèse comparée de deux articles.',
        'Propose-moi un plan de lecture progressif.',
      ]}
      emptyLabel="Aucun enseignement écrit publié pour l’instant."
    />
  );
}
