import Link from 'next/link';

import { ReindexButton } from '@/components/admin/reindex-button';
import { aiConfigured } from '@/lib/anthropic';
import { embeddingModelName } from '@/lib/embeddings';
import { prisma } from '@/lib/prisma';
import { formatDateFr } from '@/lib/slug';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [
    published,
    drafts,
    chunks,
    pendingIndex,
    members,
    openThreads,
    downloads,
    conversations,
    missingTranscript,
    recent,
  ] = await Promise.all([
    prisma.content.count({ where: { status: 'PUBLISHED' } }),
    prisma.content.count({ where: { status: 'DRAFT' } }),
    prisma.chunk.count(),
    prisma.content.count({ where: { status: 'PUBLISHED', indexedAt: null } }),
    prisma.user.count(),
    prisma.thread.count({ where: { status: 'OPEN' } }),
    prisma.download.count(),
    prisma.conversation.count(),
    prisma.content.count({
      where: { type: { in: ['VIDEO', 'AUDIO'] }, OR: [{ transcript: null }, { transcript: '' }] },
    }),
    prisma.content.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        autoClassified: true,
        pillar: { select: { title: true } },
        subRubric: { select: { title: true } },
      },
    }),
  ]);

  const checks = [
    {
      ok: aiConfigured(),
      label: 'Assistant IA (Anthropic)',
      detail: aiConfigured()
        ? 'Clé API configurée — génération et classification actives.'
        : 'ANTHROPIC_API_KEY absente : l’assistant et la classification IA sont désactivés.',
    },
    {
      ok: Boolean(process.env.YOUTUBE_API_KEY),
      label: 'Import YouTube',
      detail: process.env.YOUTUBE_API_KEY
        ? 'Clé API YouTube configurée.'
        : 'YOUTUBE_API_KEY absente : l’import automatique des vidéos est indisponible.',
    },
    {
      ok: Boolean(process.env.VOYAGE_API_KEY),
      label: `Embeddings — ${embeddingModelName()}`,
      detail: process.env.VOYAGE_API_KEY
        ? 'Moteur vectoriel externe actif.'
        : 'Moteur local de repli actif (recherche hybride lexicale + vectorielle). Suffisant pour démarrer.',
    },
    {
      ok: Boolean(process.env.TRANSCRIPTION_ENDPOINT),
      label: 'Transcription audio',
      detail: process.env.TRANSCRIPTION_ENDPOINT
        ? 'Service de transcription configuré.'
        : 'Non configuré : les transcriptions audio doivent être collées manuellement.',
    },
  ];

  return (
    <div className="space-y-10">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Contenus publiés" value={published} accent />
        <Metric label="Brouillons" value={drafts} />
        <Metric label="Fragments indexés" value={chunks} />
        <Metric label="Membres" value={members} />
        <Metric label="Consultations ouvertes" value={openThreads} href="/admin/messages" />
        <Metric label="Exemplaires délivrés" value={downloads} />
        <Metric label="Échanges avec l’IA" value={conversations} />
        <Metric label="Sans transcription" value={missingTranscript} warn={missingTranscript > 0} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="surface-strong overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="font-display text-lg text-ivory-50">Derniers contenus</h2>
            <Link href="/admin/contenus" className="text-[12.5px] text-gold-200 hover:text-gold-100">
              Tout gérer →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ivory-100/45">
              Aucun contenu. Commencez par la page <Link href="/admin/publier" className="link-underline">Publier</Link>.
            </p>
          ) : (
            <ul className="divide-y divide-white/6">
              {recent.map((content) => (
                <li key={content.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ivory-50">{content.title}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-ivory-100/45">
                      {content.type} · {content.pillar.title}
                      {content.subRubric ? ` › ${content.subRubric.title}` : ''}
                      {content.autoClassified ? ' · classé par IA' : ''} ·{' '}
                      {formatDateFr(content.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10.5px] uppercase tracking-wide ${
                      content.status === 'PUBLISHED'
                        ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200'
                        : 'border-amber-300/25 bg-amber-300/10 text-amber-200'
                    }`}
                  >
                    {content.status === 'PUBLISHED' ? 'Publié' : 'Brouillon'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-5">
          <div className="surface-strong p-5">
            <h2 className="mb-4 font-display text-lg text-ivory-50">État des services</h2>
            <ul className="space-y-3">
              {checks.map((check) => (
                <li key={check.label} className="flex gap-3">
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${
                      check.ok
                        ? 'bg-emerald-400/15 text-emerald-300'
                        : 'bg-amber-400/15 text-amber-300'
                    }`}
                  >
                    {check.ok ? '✓' : '!'}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium text-ivory-50">
                      {check.label}
                    </span>
                    <span className="block text-[11.5px] leading-relaxed text-ivory-100/50">
                      {check.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-strong p-5">
            <h2 className="mb-2 font-display text-lg text-ivory-50">Index de l’assistant</h2>
            <p className="mb-4 text-[12.5px] leading-relaxed text-ivory-100/55">
              {chunks} fragments indexés. {pendingIndex > 0 ? `${pendingIndex} contenu(s) publié(s) restent à indexer.` : 'Tout le corpus publié est indexé.'}
            </p>
            <ReindexButton />
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  warn,
  href,
}: {
  label: string;
  value: number;
  accent?: boolean;
  warn?: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className={`surface p-5 transition ${href ? 'hover:border-gold-300/30' : ''} ${
        warn ? 'border-amber-300/25' : ''
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider text-ivory-100/45">{label}</p>
      <p
        className={`mt-1.5 font-display text-3xl ${
          warn ? 'text-amber-200' : accent ? 'text-gold-200' : 'text-ivory-50'
        }`}
      >
        {value}
      </p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
