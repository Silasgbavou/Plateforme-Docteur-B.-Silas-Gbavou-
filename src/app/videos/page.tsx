import type { Metadata } from 'next';

import { LibraryPage } from '@/components/library-page';

export const metadata: Metadata = {
  title: 'Enseignements vidéo',
  description:
    'Toutes les vidéos du Docteur B. Silas Gbavou, classées automatiquement par l’intelligence artificielle dans les trois grandes rubriques.',
};

export const revalidate = 300;

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pilier?: string }>;
}) {
  const params = await searchParams;
  return (
    <LibraryPage
      type="VIDEO"
      eyebrow="Espace vidéos"
      title="Les enseignements en vidéo"
      description="Chaque vidéo est intégrée depuis YouTube, sa transcription automatique est analysée par l’IA, puis l’enseignement est rangé dans la bonne sous-rubrique du bon pilier. Vous pouvez interroger l’IA sur la transcription de chaque vidéo."
      searchParams={params}
      assistantTitle="Assistant — corpus vidéo"
      suggestions={[
        'Quelles vidéos parlent de l’intercession ?',
        'Résume les enseignements récents.',
        'Quel est le fil conducteur de la série sur le jeûne ?',
      ]}
      emptyLabel="Aucune vidéo publiée pour l’instant. L’import YouTube s’effectue depuis l’espace d’administration."
    />
  );
}
