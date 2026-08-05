import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AiAssistant } from '@/components/ai-assistant';
import { BookDownload } from '@/components/book-download';
import { PdfReader } from '@/components/pdf-reader';
import { Breadcrumb } from '@/components/section';
import { getCurrentUser } from '@/lib/auth';
import { LICENSE_CLAUSES } from '@/lib/pdf';
import { getContentBySlug } from '@/lib/queries';
import { SITE } from '@/lib/site';
import { formatBytes, formatDateFr } from '@/lib/slug';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await getContentBySlug(slug);
  if (!book || book.type !== 'BOOK') return {};
  return {
    title: book.title,
    description: book.summary || undefined,
    robots: { index: true, follow: true },
  };
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getContentBySlug(slug);
  if (!book || book.type !== 'BOOK') notFound();

  const user = await getCurrentUser();

  return (
    <div className="container-page py-10">
      <Breadcrumb
        items={[
          { href: '/', label: 'Accueil' },
          { href: '/livres', label: 'Livres' },
          { label: book.title },
        ]}
      />

      <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="min-w-0">
          <header className="mb-7">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="badge border-gold-300/25 bg-gold-300/10 text-gold-200">
                Livre PDF
              </span>
              <span className="badge">{SITE.copyright}</span>
              {book.publishedAt && (
                <span className="text-[12px] text-ivory-100/45">
                  {formatDateFr(book.publishedAt)}
                </span>
              )}
            </div>

            <h1 className="text-balance font-display text-[34px] leading-[1.12] text-ivory-50 sm:text-[42px]">
              {book.title}
            </h1>
            <p className="mt-2 text-[14px] text-gold-300/75">{SITE.name}</p>

            {book.summary && (
              <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-ivory-100/65">
                {book.summary}
              </p>
            )}

            <p className="mt-4 text-[12.5px] text-ivory-100/40">
              {[
                book.pageCount ? `${book.pageCount} pages` : null,
                book.fileSize ? formatBytes(book.fileSize) : null,
                book.isbn ? `ISBN ${book.isbn}` : null,
                book.pillar.title,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </header>

          <PdfReader contentId={book.id} title={book.title} canRead={Boolean(user)} />

          {book.body && (
            <section className="prose-ministry mt-10 max-w-3xl">
              <h2>À propos de cet ouvrage</h2>
              {book.body.split(/\n{2,}/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </section>
          )}

          <section className="surface mt-10 p-6">
            <h2 className="font-display text-xl text-ivory-50">Licence de lecture</h2>
            <ul className="mt-4 space-y-2 text-[13.5px] leading-relaxed text-ivory-100/65">
              {LICENSE_CLAUSES.map((clause) => (
                <li key={clause} className="flex gap-2.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-300/70" />
                  {clause}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[12px] text-ivory-100/45">
              Questions relatives aux droits :{' '}
              <a href={`mailto:${SITE.email}`} className="link-underline">
                {SITE.email}
              </a>{' '}
              ·{' '}
              <Link href="/droits-d-auteur" className="link-underline">
                Notice complète
              </Link>
            </p>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <BookDownload
            contentId={book.id}
            title={book.title}
            isAuthenticated={Boolean(user)}
            allowDownload={book.allowDownload}
          />

          <AiAssistant
            scope="CONTENT"
            scopeId={book.id}
            title="Étudier ce livre avec l’IA"
            contextLabel="Réponses fondées sur le texte de cet ouvrage."
            compact
            suggestions={[
              'Résume ce livre chapitre par chapitre.',
              'Quelle est la thèse centrale de l’auteur ?',
              'Donne-moi un plan d’étude en 7 jours.',
            ]}
          />
        </aside>
      </div>
    </div>
  );
}
