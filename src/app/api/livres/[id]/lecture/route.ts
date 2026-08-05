import { readFile } from 'node:fs/promises';

import { apiError, handleApiError } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveStoredPath } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Flux de lecture en ligne d'un livre.
 *
 * Le PDF n'est jamais servi depuis /public : il transite par cette route, qui
 * exige une session valide et interdit toute mise en cache intermédiaire.
 * L'en-tête Content-Disposition « inline » ouvre la liseuse sans proposer
 * l'enregistrement ; l'exemplaire téléchargeable, lui, passe par la route
 * /telechargement qui appose la licence nominative.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await params;

    const book = await prisma.content.findFirst({
      where: { id, type: 'BOOK', status: 'PUBLISHED' },
      select: { id: true, title: true, filePath: true },
    });

    if (!book?.filePath) return apiError('Ouvrage introuvable.', 404);

    const buffer = await readFile(resolveStoredPath(book.filePath));

    return new Response(new Uint8Array(buffer), {
      headers: {
        'content-type': 'application/pdf',
        'content-length': String(buffer.byteLength),
        'content-disposition': `inline; filename="lecture.pdf"`,
        'cache-control': 'private, no-store, max-age=0',
        'x-copyright': 'Tous droits reserves - Dr B. Silas Gbavou',
        'x-robots-tag': 'noindex, nofollow, noarchive',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
