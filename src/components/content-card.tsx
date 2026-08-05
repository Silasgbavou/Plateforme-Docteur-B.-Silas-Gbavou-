import Link from 'next/link';

import { formatBytes, formatDateFr, formatDuration } from '@/lib/slug';
import { CONTENT_TYPE_LABEL, type ContentType } from '@/lib/taxonomy';

export interface ContentCardData {
  id: string;
  slug: string;
  type: string;
  title: string;
  summary: string;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  fileSize?: number | null;
  pageCount?: number | null;
  publishedAt?: Date | string | null;
  pillar?: { title: string; slug: string } | null;
  subRubric?: { title: string; slug: string } | null;
}

const TYPE_STYLES: Record<string, { badge: string; icon: React.ReactNode }> = {
  ARTICLE: { badge: 'text-sky-200 border-sky-300/25 bg-sky-300/10', icon: <PenIcon /> },
  AUDIO: { badge: 'text-emerald-200 border-emerald-300/25 bg-emerald-300/10', icon: <WaveIcon /> },
  VIDEO: { badge: 'text-rose-200 border-rose-300/25 bg-rose-300/10', icon: <PlayIcon /> },
  BOOK: { badge: 'text-gold-200 border-gold-300/25 bg-gold-300/10', icon: <BookIcon /> },
};

export function ContentCard({ content }: { content: ContentCardData }) {
  const style = TYPE_STYLES[content.type] ?? TYPE_STYLES.ARTICLE;
  const href = content.type === 'BOOK' ? `/livres/${content.slug}` : `/contenus/${content.slug}`;

  const meta = [
    content.durationSec ? formatDuration(content.durationSec) : null,
    content.pageCount ? `${content.pageCount} pages` : null,
    content.fileSize ? formatBytes(content.fileSize) : null,
    content.publishedAt ? formatDateFr(content.publishedAt) : null,
  ].filter(Boolean);

  return (
    <article className="group surface overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:border-gold-300/30 hover:shadow-elevated">
      <Link href={href} className="block">
        {content.thumbnailUrl ? (
          <div className="relative aspect-video overflow-hidden bg-night-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.thumbnailUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-night-950/85 via-night-950/10 to-transparent" />
            {content.type === 'VIDEO' && (
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-night-950/70 text-ivory-50 backdrop-blur transition group-hover:scale-110 group-hover:bg-gold-300 group-hover:text-night-950">
                  <PlayIcon />
                </span>
              </span>
            )}
            {content.durationSec ? (
              <span className="absolute bottom-2 right-2 rounded bg-night-950/85 px-1.5 py-0.5 text-[11px] font-medium text-ivory-100">
                {formatDuration(content.durationSec)}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2.5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${style.badge}`}
            >
              {style.icon}
              {CONTENT_TYPE_LABEL[content.type as ContentType] ?? content.type}
            </span>
            {content.subRubric && (
              <span className="text-[11px] text-ivory-100/45">{content.subRubric.title}</span>
            )}
          </div>

          <h3 className="font-display text-[19px] leading-snug text-ivory-50 transition group-hover:text-gold-100">
            {content.title}
          </h3>

          {content.summary && (
            <p className="line-clamp-3 text-[13.5px] leading-relaxed text-ivory-100/60">
              {content.summary}
            </p>
          )}

          {meta.length > 0 && (
            <p className="pt-1 text-[11.5px] text-ivory-100/40">{meta.join(' · ')}</p>
          )}
        </div>
      </Link>
    </article>
  );
}

export function ContentGrid({
  contents,
  emptyLabel = 'Aucun contenu publié pour le moment.',
}: {
  contents: ContentCardData[];
  emptyLabel?: string;
}) {
  if (contents.length === 0) {
    return (
      <p className="surface px-6 py-10 text-center text-sm text-ivory-100/50">{emptyLabel}</p>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {contents.map((content) => (
        <ContentCard key={content.id} content={content} />
      ))}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M5 3h11a3 3 0 013 3v15H8a3 3 0 01-3-3V3zm3 2v13h9V6a1 1 0 00-1-1H8z" />
    </svg>
  );
}
function WaveIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 10h2v4H3v-4zm4-3h2v10H7V7zm4-3h2v16h-2V4zm4 4h2v8h-2V8zm4 2h2v4h-2v-4z" />
    </svg>
  );
}
function PenIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 17.2V21h3.8L18 9.8 14.2 6 3 17.2zM20.7 7.1a1 1 0 000-1.4l-2.4-2.4a1 1 0 00-1.4 0l-1.8 1.8L18.9 8.9l1.8-1.8z" />
    </svg>
  );
}
