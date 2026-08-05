import { z } from 'zod';

import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { classifyContent, resolveClassification } from '@/lib/classify';
import { prisma } from '@/lib/prisma';
import { indexContent } from '@/lib/rag';
import { uniqueSlug } from '@/lib/slug';
import { extractVideoId, fetchChannelVideos, fetchTranscript, fetchVideo } from '@/lib/youtube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const schema = z.object({
  mode: z.enum(['single', 'channel']).default('single'),
  url: z.string().optional(),
  channelId: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
  publish: z.boolean().default(false),
  transcript: z.string().max(400_000).optional(),
});

/**
 * Import YouTube avec auto-catégorisation.
 *
 * Chaîne de traitement pour chaque vidéo :
 *   1. métadonnées via l'API YouTube Data v3 ;
 *   2. récupération de la transcription automatique (ou transcription fournie) ;
 *   3. analyse IA : déduction du pilier + de la sous-rubrique + résumé ;
 *   4. création du contenu et indexation dans le moteur RAG.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = schema.parse(await request.json());

    if (!process.env.YOUTUBE_API_KEY) {
      return apiError(
        "La clé YOUTUBE_API_KEY n'est pas configurée sur le serveur.",
        503,
      );
    }

    const videos =
      body.mode === 'channel'
        ? await fetchChannelVideos(
            body.channelId || process.env.YOUTUBE_CHANNEL_ID || '',
            body.limit,
          )
        : await (async () => {
            const id = extractVideoId(body.url ?? '');
            if (!id) throw new Error('Lien ou identifiant YouTube invalide.');
            return [await fetchVideo(id)];
          })();

    const results: {
      youtubeId: string;
      title: string;
      status: 'created' | 'updated' | 'skipped';
      pillar?: string;
      subRubric?: string;
      transcript: boolean;
      chunks?: number;
      note?: string;
    }[] = [];

    for (const video of videos) {
      const existing = await prisma.content.findFirst({
        where: { youtubeId: video.youtubeId },
        select: { id: true, transcript: true, slug: true },
      });

      // Transcription : celle fournie manuellement (mode single) sinon l'ASR YouTube.
      const transcript =
        (body.mode === 'single' && body.transcript?.trim()) ||
        existing?.transcript ||
        (await fetchTranscript(video.youtubeId)) ||
        null;

      const classification = await classifyContent({
        title: video.title,
        description: video.description,
        text: transcript ?? video.description,
      });
      const { pillarId, subRubricId } = await resolveClassification(classification);

      const data = {
        type: 'VIDEO',
        title: video.title,
        summary: classification.summary,
        youtubeId: video.youtubeId,
        thumbnailUrl: video.thumbnailUrl,
        durationSec: video.durationSec,
        publishedOn: video.publishedAt,
        transcript,
        pillarId,
        subRubricId,
        autoClassified: true,
        classificationNote: `${classification.method === 'ia' ? 'IA' : 'Lexical'} · confiance ${(
          classification.confidence * 100
        ).toFixed(0)} % · ${classification.rationale}`,
        tags: classification.keywords.join(', '),
        status: body.publish ? 'PUBLISHED' : 'DRAFT',
        publishedAt: body.publish ? (video.publishedAt ?? new Date()) : null,
      };

      let contentId: string;
      let action: 'created' | 'updated';

      if (existing) {
        await prisma.content.update({ where: { id: existing.id }, data });
        contentId = existing.id;
        action = 'updated';
      } else {
        const slug = await uniqueSlug(video.title, async (candidate) =>
          Boolean(await prisma.content.findUnique({ where: { slug: candidate } })),
        );
        const created = await prisma.content.create({ data: { ...data, slug } });
        contentId = created.id;
        action = 'created';
      }

      let chunks = 0;
      if (body.publish) {
        chunks = await indexContent(contentId);
      }

      results.push({
        youtubeId: video.youtubeId,
        title: video.title,
        status: action,
        pillar: classification.pillarKey,
        subRubric: classification.subRubricSlug,
        transcript: Boolean(transcript),
        chunks,
        note: transcript
          ? undefined
          : "Transcription indisponible : collez-la manuellement pour alimenter l'IA.",
      });
    }

    return apiOk({ imported: results.length, results });
  } catch (error) {
    return handleApiError(error);
  }
}
