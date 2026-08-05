import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { classifyContent, resolveClassification } from '@/lib/classify';
import { countPages } from '@/lib/pdf';
import { prisma } from '@/lib/prisma';
import { indexContent } from '@/lib/rag';
import { uniqueSlug } from '@/lib/slug';
import { saveBuffer } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_SIZE = 120 * 1024 * 1024; // 120 Mo

/**
 * Dépôt d'un livre PDF.
 *
 * Le fichier est enregistré hors racine web (dossier de stockage privé) :
 * il ne sera jamais servi en statique, mais uniquement par les routes
 * protégées de lecture et de téléchargement sous licence nominative.
 *
 * Le texte intégral fourni (optionnel) alimente le RAG pour permettre à
 * l'assistant de répondre sur le contenu de l'ouvrage.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return apiError('Aucun fichier PDF reçu.', 400);
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return apiError('Seuls les fichiers PDF sont acceptés.', 415);
    }
    if (file.size > MAX_SIZE) return apiError('Fichier trop volumineux (120 Mo maximum).', 413);

    const title = String(form.get('title') ?? '').trim() || file.name.replace(/\.pdf$/i, '');
    const summary = String(form.get('summary') ?? '').trim();
    const body = String(form.get('body') ?? '').trim();
    const fullText = String(form.get('fullText') ?? '').trim();
    const isbn = String(form.get('isbn') ?? '').trim() || null;
    const coverUrl = String(form.get('coverUrl') ?? '').trim() || null;
    const allowDownload = String(form.get('allowDownload') ?? 'true') !== 'false';
    const publish = String(form.get('publish') ?? '') === 'true';
    const pillarKeyInput = String(form.get('pillarKey') ?? '').trim();
    const subRubricSlugInput = String(form.get('subRubricSlug') ?? '').trim();

    const buffer = Buffer.from(await file.arrayBuffer());
    const pageCount = await countPages(buffer);
    const stored = await saveBuffer(buffer, { folder: 'books', originalName: file.name });

    let pillarId: string;
    let subRubricId: string | null;
    let note = 'Classement manuel par l’administrateur.';
    let finalSummary = summary;
    let tags = '';
    let autoClassified = false;

    if (pillarKeyInput) {
      const pillar = await prisma.pillar.findUnique({
        where: { key: pillarKeyInput },
        include: { subRubrics: true },
      });
      if (!pillar) return apiError('Pilier inconnu.', 400);
      pillarId = pillar.id;
      subRubricId = pillar.subRubrics.find((s) => s.slug === subRubricSlugInput)?.id ?? null;
    } else {
      const classification = await classifyContent({
        title,
        text: fullText || body || summary || title,
      });
      const resolved = await resolveClassification(classification);
      pillarId = resolved.pillarId;
      subRubricId = resolved.subRubricId;
      finalSummary = finalSummary || classification.summary;
      tags = classification.keywords.join(', ');
      autoClassified = true;
      note = `${classification.method === 'ia' ? 'IA' : 'Lexical'} · confiance ${(
        classification.confidence * 100
      ).toFixed(0)} % · ${classification.rationale}`;
    }

    const slug = await uniqueSlug(title, async (candidate) =>
      Boolean(await prisma.content.findUnique({ where: { slug: candidate } })),
    );

    const content = await prisma.content.create({
      data: {
        type: 'BOOK',
        slug,
        title,
        summary: finalSummary,
        body: body || null,
        transcript: fullText || null,
        filePath: stored.relativePath,
        fileSize: stored.size,
        pageCount,
        coverUrl,
        thumbnailUrl: coverUrl,
        isbn,
        allowDownload,
        pillarId,
        subRubricId,
        autoClassified,
        classificationNote: note,
        tags,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        publishedAt: publish ? new Date() : null,
      },
    });

    const chunks = publish ? await indexContent(content.id) : 0;

    return apiOk(
      {
        id: content.id,
        slug: content.slug,
        title: content.title,
        pageCount,
        chunks,
        note: fullText
          ? undefined
          : "Aucun texte intégral fourni : l'assistant ne pourra pas citer le contenu de l'ouvrage.",
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
