import { z } from 'zod';

import { apiError, clientIp, handleApiError, rateLimit } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { buildLicensedPdf, newLicenseCode } from '@/lib/pdf';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ acceptLicense: z.literal(true) });

/**
 * Délivrance d'un exemplaire nominatif.
 *
 * Dispositif anti-revente :
 *   1. acceptation explicite de la licence par l'utilisateur ;
 *   2. génération à la volée d'un PDF filigrané au nom du titulaire ;
 *   3. inscription au registre des licences (code unique, IP, agent) ;
 *   4. quota journalier pour empêcher la constitution automatisée de stocks.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const body = schema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) {
      return apiError('Vous devez accepter les conditions d’utilisation personnelle.', 400);
    }

    const ip = clientIp(request);
    if (!rateLimit(`dl:${user.id}`, 12, 60 * 60 * 1000)) {
      return apiError(
        'Limite de téléchargements atteinte pour cette heure. Réessayez plus tard.',
        429,
      );
    }

    const book = await prisma.content.findFirst({
      where: { id, type: 'BOOK', status: 'PUBLISHED' },
      select: { id: true, title: true, filePath: true, allowDownload: true },
    });

    if (!book?.filePath) return apiError('Ouvrage introuvable.', 404);
    if (!book.allowDownload) {
      return apiError('Le téléchargement de cet ouvrage n’est pas autorisé.', 403);
    }

    // Quota journalier : lecture personnelle, pas collecte de masse.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await prisma.download.count({
      where: { userId: user.id, createdAt: { gte: since } },
    });
    if (recent >= 20) {
      return apiError(
        'Quota journalier de téléchargements atteint. Contactez le ministère si vous avez un besoin particulier.',
        429,
      );
    }

    const licenseCode = newLicenseCode();
    const issuedAt = new Date();

    const pdf = await buildLicensedPdf(book.filePath, {
      licenseCode,
      recipientName: user.name,
      recipientEmail: user.email,
      bookTitle: book.title,
      issuedAt,
    });

    await prisma.download.create({
      data: {
        contentId: book.id,
        userId: user.id,
        licenseCode,
        ip,
        userAgent: request.headers.get('user-agent')?.slice(0, 400) ?? null,
      },
    });

    if (!user.acceptedLicenseAt) {
      await prisma.user.update({
        where: { id: user.id },
        data: { acceptedLicenseAt: issuedAt },
      });
    }

    return new Response(new Uint8Array(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-length': String(pdf.byteLength),
        'content-disposition': `attachment; filename="${licenseCode}.pdf"`,
        'x-license-code': licenseCode,
        'access-control-expose-headers': 'x-license-code',
        'cache-control': 'private, no-store, max-age=0',
        'x-copyright': 'Tous droits reserves - Dr B. Silas Gbavou',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
