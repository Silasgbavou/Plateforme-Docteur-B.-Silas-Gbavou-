import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AiAssistant } from '@/components/ai-assistant';
import { ContentGrid } from '@/components/content-card';
import { AudioPlayer, YouTubeEmbed } from '@/components/media';
import { Breadcrumb, SectionHeading } from '@/components/section';
import { getContentBySlug, relatedContents } from '@/lib/queries';
import { SITE } from '@/lib/site';
import { formatDateFr, formatDuration } from '@/lib/slug';
import { CONTENT_TYPE_LABEL, type ContentType } from '@/lib/taxonomy';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const content = await getContentBySlug(slug);
  if (!content) return {};
  return {
    title: content.title,
    description: content.summary || undefined,
    openGraph: {
      title: content.title,
      description: content.summary || undefined,
      images: content.thumbnailUrl ? [content.thumbnailUrl] : undefined,
    },
  };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = await getContentBySlug(slug);
  if (!content) notFound();
  if (content.type === 'BOOK') {
    // Les livres possèdent leur propre gabarit protégé.
    notFound();
  }

  const related = await relatedContents({
    id: content.id,
    pillarId: content.pillarId,
    subRubricId: content.subRubricId,
  });

  const tags = content.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <article className="container-page py-10">
      <Breadcrumb
        items={[
          { href: '/', label: 'Accueil' },
          { href: `/${content.pillar.slug}`, label: content.pillar.title },
          ...(content.subRubric
            ? [{ href: `/${content.pillar.slug}/${content.subRubric.slug}`, label: content.subRubric.title }]
            : []),
          { label: content.title },
        ]}
      />

      <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="min-w-0">
          <header className="mb-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="badge border-gold-300/25 bg-gold-300/10 text-gold-200">
                {CONTENT_TYPE_LABEL[content.type as ContentType]}
              </span>
              {content.autoClassified && (
                <span className="badge" title={content.classificationNote ?? undefined}>
                  Classé par l’IA
                </span>
              )}
              {content.publishedAt && (
                <span className="text-[12px] text-ivory-100/45">
                  {formatDateFr(content.publishedAt)}
                </span>
              )}
              {content.durationSec ? (
                <span className="text-[12px] text-ivory-100/45">
                  {formatDuration(content.durationSec)}
                </span>
              ) : null}
            </div>

            <h1 className="text-balance font-display text-[34px] leading-[1.12] text-ivory-50 sm:text-[42px]">
              {content.title}
            </h1>

            {content.summary && (
              <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-ivory-100/65">
                {content.summary}
              </p>
            )}
          </header>

          {/* Lecteur */}
          {content.type === 'VIDEO' && content.youtubeId && (
            <div className="mb-8">
              <YouTubeEmbed youtubeId={content.youtubeId} title={content.title} />
              <p className="mt-3 text-[12px] text-ivory-100/40">
                Vidéo intégrée depuis YouTube. Lecture sur la plateforme, sans téléchargement.
              </p>
            </div>
          )}

          {content.type === 'AUDIO' && content.audioPath && (
            <div className="mb-8">
              <AudioPlayer
                src={`/api/audios/${content.id}`}
                title={content.title}
                durationSec={content.durationSec}
              />
            </div>
          )}

          {/* Corps de l'enseignement écrit */}
          {content.type === 'ARTICLE' && content.body && (
            <div className="prose-ministry max-w-3xl">{renderBody(content.body)}</div>
          )}

          {/* Transcription */}
          {content.transcript && content.type !== 'ARTICLE' && (
            <details className="surface mt-8 overflow-hidden">
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-ivory-100/85 transition hover:text-gold-200">
                <span className="mr-2 text-gold-300/70">▸</span>
                Transcription intégrale de cet enseignement
                <span className="ml-2 text-[11px] font-normal text-ivory-100/40">
                  ({Math.round(content.transcript.length / 1000)} k caractères — base de l’assistant IA)
                </span>
              </summary>
              <div className="scrollbar-slim max-h-[520px] overflow-y-auto border-t border-white/10 px-5 py-5">
                <p className="whitespace-pre-wrap text-[14.5px] leading-[1.85] text-ivory-100/70">
                  {content.transcript}
                </p>
              </div>
            </details>
          )}

          {tags.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag} className="badge">
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <footer className="mt-10 border-t border-white/10 pt-6 text-[12.5px] text-ivory-100/45">
            © {new Date().getFullYear()} {SITE.name} — {SITE.copyright}. Reproduction et diffusion
            commerciale interdites sans autorisation écrite.
          </footer>

          {related.length > 0 && (
            <section className="mt-16">
              <SectionHeading eyebrow="À poursuivre" title="Enseignements liés" />
              <ContentGrid contents={related} />
            </section>
          )}
        </div>

        {/* Assistant IA sur CE contenu précis */}
        <aside className="lg:sticky lg:top-24">
          <AiAssistant
            scope="CONTENT"
            scopeId={content.id}
            title="Questionner cet enseignement"
            contextLabel={
              content.transcript
                ? 'Basé sur la transcription intégrale de cet enseignement.'
                : 'Basé sur le texte de cet enseignement.'
            }
            compact
            suggestions={[
              'Résume cet enseignement en 5 points.',
              'Quels passages bibliques sont cités ?',
              'Explique-moi le point le plus difficile.',
            ]}
          />

          <div className="surface mt-5 p-5">
            <p className="eyebrow mb-3">Situer dans l’arborescence</p>
            <Link
              href={`/${content.pillar.slug}`}
              className="block text-[15px] font-medium text-ivory-50 transition hover:text-gold-200"
            >
              {content.pillar.title}
            </Link>
            {content.subRubric && (
              <Link
                href={`/${content.pillar.slug}/${content.subRubric.slug}`}
                className="mt-1 block pl-4 text-[14px] text-ivory-100/60 transition hover:text-gold-200"
              >
                › {content.subRubric.title}
              </Link>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}

/** Rendu Markdown allégé (titres, listes, citations, gras) côté serveur. */
function renderBody(body: string) {
  return body.split(/\n{2,}/).map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (/^###\s/.test(trimmed)) return <h3 key={i}>{inline(trimmed.replace(/^###\s*/, ''))}</h3>;
    if (/^##\s/.test(trimmed)) return <h2 key={i}>{inline(trimmed.replace(/^##\s*/, ''))}</h2>;
    if (/^>\s/.test(trimmed)) {
      return (
        <blockquote key={i}>
          {inline(trimmed.replace(/^>\s?/gm, ''))}
        </blockquote>
      );
    }

    const lines = trimmed.split('\n');
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      return (
        <ul key={i}>
          {lines.map((line, j) => (
            <li key={j}>{inline(line.replace(/^\s*[-*]\s+/, ''))}</li>
          ))}
        </ul>
      );
    }
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      return (
        <ol key={i}>
          {lines.map((line, j) => (
            <li key={j}>{inline(line.replace(/^\s*\d+[.)]\s+/, ''))}</li>
          ))}
        </ol>
      );
    }

    return <p key={i}>{inline(trimmed)}</p>;
  });
}

function inline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}
