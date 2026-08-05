import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { Readable } from 'node:stream';

import { apiError, handleApiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { resolveStoredPath } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Diffusion des audios (dont le format natif WhatsApp .opus / audio-ogg).
 *
 * Gère les requêtes Range afin que la barre de progression et le déplacement
 * dans la piste fonctionnent sur mobile comme sur ordinateur.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const content = await prisma.content.findFirst({
      where: { id, type: 'AUDIO', status: 'PUBLISHED' },
      select: { audioPath: true, audioMime: true },
    });

    if (!content?.audioPath) return apiError('Audio introuvable.', 404);

    const full = resolveStoredPath(content.audioPath);
    const info = await stat(full);
    const mime = content.audioMime || 'audio/ogg';
    const range = request.headers.get('range');

    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      const start = match?.[1] ? Number(match[1]) : 0;
      const end = match?.[2] ? Number(match[2]) : info.size - 1;

      if (Number.isNaN(start) || start >= info.size) {
        return new Response(null, {
          status: 416,
          headers: { 'content-range': `bytes */${info.size}` },
        });
      }

      const safeEnd = Math.min(end, info.size - 1);
      const stream = createReadStream(full, { start, end: safeEnd });

      return new Response(toWebStream(stream), {
        status: 206,
        headers: {
          'content-type': mime,
          'content-length': String(safeEnd - start + 1),
          'content-range': `bytes ${start}-${safeEnd}/${info.size}`,
          'accept-ranges': 'bytes',
          'cache-control': 'private, max-age=3600',
        },
      });
    }

    return new Response(toWebStream(createReadStream(full)), {
      headers: {
        'content-type': mime,
        'content-length': String(info.size),
        'accept-ranges': 'bytes',
        'cache-control': 'private, max-age=3600',
        'x-copyright': 'Tous droits reserves - Dr B. Silas Gbavou',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function toWebStream(stream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      stream.on('data', (chunk: Buffer | string) => {
        controller.enqueue(
          typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk),
        );
      });
      stream.on('end', () => controller.close());
      stream.on('error', (error) => controller.error(error));
    },
    cancel() {
      stream.destroy();
    },
  });
}
