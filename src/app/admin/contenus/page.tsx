import { ContentTable } from '@/components/admin/content-table';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminContentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const params = await searchParams;

  const where: Record<string, unknown> = {};
  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;

  const contents = await prisma.content.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      status: true,
      createdAt: true,
      indexedAt: true,
      autoClassified: true,
      classificationNote: true,
      transcript: true,
      pillar: { select: { key: true, title: true } },
      subRubric: { select: { slug: true, title: true } },
      _count: { select: { chunks: true } },
    },
  });

  return (
    <div>
      <div className="mb-7">
        <h2 className="font-display text-2xl text-ivory-50">Gérer les contenus</h2>
        <p className="mt-1.5 text-sm text-ivory-100/55">
          Publier, corriger le classement, relancer l’indexation ou supprimer.
        </p>
      </div>

      <ContentTable
        contents={contents.map((content) => ({
          ...content,
          createdAt: content.createdAt.toISOString(),
          indexedAt: content.indexedAt?.toISOString() ?? null,
          hasTranscript: Boolean(content.transcript && content.transcript.length > 50),
          transcript: undefined,
        }))}
      />
    </div>
  );
}
