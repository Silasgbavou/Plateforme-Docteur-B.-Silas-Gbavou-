import type { Metadata } from 'next';

import { LibraryPage } from '@/components/library-page';

export const metadata: Metadata = {
  title: 'Enseignements audio',
  description:
    'Les enseignements audio du Docteur B. Silas Gbavou, classés selon la règle des trois piliers.',
};

export const revalidate = 300;

export default async function AudiosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pilier?: string }>;
}) {
  const params = await searchParams;
  return (
    <LibraryPage
      type="AUDIO"
      eyebrow="Espace audios"
      title="Les enseignements audio"
      description="Messages, exhortations et sessions de formation à écouter directement sur la plateforme. Les audios transférés depuis WhatsApp (format natif .opus) sont lus sans conversion."
      searchParams={params}
      assistantTitle="Assistant — corpus audio"
      suggestions={[
        'Quels audios traitent de la sainteté ?',
        'Résume-moi le dernier message audio.',
        'Donne-moi les points clés des enseignements audio.',
      ]}
      emptyLabel="Aucun audio publié pour l’instant."
    />
  );
}
