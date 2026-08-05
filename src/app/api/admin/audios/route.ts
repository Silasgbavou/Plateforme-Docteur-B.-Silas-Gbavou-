import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { classifyContent, resolveClassification } from '@/lib/classify';
import { prisma } from '@/lib/prisma';
import { indexContent } from '@/lib/rag';
import { uniqueSlug } from '@/lib/slug';
import { AUDIO_EXTENSIONS, audioMimeFor, saveBuffer, transcribeAudio } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_SIZE = 200 * 1024 * 1024; // 200 Mo

/**
 * Module de transfert des audios — pensé pour les messages WhatsApp.
 *
 * Le format natif WhatsApp (.opus, conteneur OGG) est accepté tel quel :
 * aucune conversion n'est demandée à l'administrateur. La transcription est
 * soit fournie manuellement, soit produite par le service configuré ; elle
 * alimente ensuite la classification IA puis l'index RAG.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return apiError('Aucun fichier audio reçu.', 400);
    if (file.size === 0) return apiError('Le fichier est vide.', 400);
    if (file.size > MAX_SIZE) {
      return apiError('Fichier trop volumineux (200 Mo maximum).', 413);
    }

    const lower = file.name.toLowerCase();
    if (!AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      return apiError(
        `Format non pris en charge. Formats acceptés : ${AUDIO_EXTENSIONS.join(', ')}.`,
        415,
      );
    }

    const title = String(form.get('title') ?? '').trim() || file.name.replace(/\.[^.]+$/, '');
    const providedTranscript = String(form.get('transcript') ?? '').trim();
    const summaryInput = String(form.get('summary') ?? '').trim();
    const publish = String(form.get('publish') ?? '') === 'true';
    const durationSec = Number(form.get('durationSec') ?? 0) || null;
    const pillarKeyInput = String(form.get('pillarKey') ?? '').trim();
    const subRubricSlugInput = String(form.get('subRubricSlug') ?? '').trim();

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await saveBuffer(buffer, { folder: 'audio', originalName: file.name });
    const mime = audioMimeFor(file.name, file.type);

    // Transcription : fournie, sinon service externe si configuré.
    const transcript =
      providedTranscript || (await transcribeAudio(buffer, file.name, mime)) || null;

    // Classification : manuelle si l'administrateur l'impose, sinon IA.
    let pillarId: string;
    let subRubricId: string | null;
    let note: string;
    let summary = summaryInput;
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
      note = 'Classement manuel par l’administrateur.';
    } else {
      const classification = await classifyContent({
        title,
        text: transcript ?? summaryInput ?? title,
      });
      const resolved = await resolveClassification(classification);
      pillarId = resolved.pillarId;
      subRubricId = resolved.subRubricId;
      summary = summary || classification.summary;
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
        type: 'AUDIO',
        slug,
        title,
        summary,
        audioPath: stored.relativePath,
        audioMime: mime,
        audioSize: stored.size,
        durationSec,
        transcript,
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
        transcript: Boolean(transcript),
        chunks,
        note: transcript
          ? undefined
          : "Aucune transcription : l'IA ne pourra pas exploiter cet audio tant qu'elle n'est pas fournie.",
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
