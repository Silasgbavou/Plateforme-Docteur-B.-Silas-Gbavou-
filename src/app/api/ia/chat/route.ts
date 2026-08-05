import { z } from 'zod';

import { MODEL, aiConfigured, anthropic } from '@/lib/anthropic';
import { apiError, clientIp, rateLimit } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  RAG_SYSTEM_PROMPT,
  buildCorpusBlock,
  retrieve,
  sourcesFromChunks,
  type RetrievalScope,
} from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  question: z.string().min(2).max(2000),
  scope: z.enum(['GLOBAL', 'PILLAR', 'SUBRUBRIC', 'CONTENT']).default('GLOBAL'),
  scopeId: z.string().optional().nullable(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(8000),
      }),
    )
    .max(20)
    .default([]),
});

/**
 * Chat RAG en flux (JSON Lines).
 *
 * Séquence : recherche dans le corpus → envoi des sources au client →
 * génération streamée par Claude, strictement contrainte aux extraits fournis.
 */
export async function POST(request: Request) {
  try {
    if (!aiConfigured()) {
      return apiError(
        "L'assistant n'est pas encore activé : la clé ANTHROPIC_API_KEY doit être renseignée sur le serveur.",
        503,
      );
    }

    const ip = clientIp(request);
    if (!rateLimit(`ia:${ip}`, 30, 60_000)) {
      return apiError('Trop de questions en peu de temps. Merci de patienter un instant.', 429);
    }

    const body = schema.parse(await request.json());
    const session = await getSession();

    const scope = await resolveScope(body.scope, body.scopeId ?? undefined);
    const chunks = await retrieve(body.question, scope, 8);
    const sources = sourcesFromChunks(chunks);

    const corpus = buildCorpusBlock(chunks);
    const contextHint = await scopeHint(body.scope, body.scopeId ?? undefined);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (payload: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        emit({ type: 'sources', sources });

        let answer = '';
        try {
          const messages = [
            ...body.history.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
            {
              role: 'user' as const,
              content: [
                contextHint ? `<contexte_de_navigation>${contextHint}</contexte_de_navigation>` : '',
                corpus,
                '',
                `Question de l'internaute : ${body.question}`,
              ]
                .filter(Boolean)
                .join('\n'),
            },
          ];

          const aiStream = anthropic().messages.stream({
            model: MODEL,
            max_tokens: 4000,
            system: [
              {
                type: 'text' as const,
                text: RAG_SYSTEM_PROMPT,
                // Le prompt système est stable : on le met en cache.
                cache_control: { type: 'ephemeral' as const },
              },
            ],
            thinking: { type: 'adaptive' },
            output_config: { effort: 'medium' },
            messages,
          });

          aiStream.on('text', (delta: string) => {
            answer += delta;
            emit({ type: 'delta', text: delta });
          });

          const final = await aiStream.finalMessage();

          if (final.stop_reason === 'refusal') {
            emit({
              type: 'error',
              message:
                "Cette demande n'a pas pu être traitée. Reformulez votre question ou écrivez au Bureau de consultation.",
            });
          } else {
            emit({ type: 'done', sources });
            await persist({
              userId: session?.sub ?? null,
              scope: body.scope,
              scopeId: body.scopeId ?? null,
              question: body.question,
              answer,
              sources,
            });
          }
        } catch (error) {
          console.error('[ia/chat]', error);
          emit({
            type: 'error',
            message:
              error instanceof Error
                ? `L'assistant a rencontré une difficulté : ${error.message}`
                : "L'assistant a rencontré une difficulté.",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'cache-control': 'no-store, no-transform',
        'x-accel-buffering': 'no',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return apiError('Question invalide.', 422);
    console.error('[ia/chat]', error);
    return apiError("L'assistant est momentanément indisponible.", 500);
  }
}

async function resolveScope(
  scope: 'GLOBAL' | 'PILLAR' | 'SUBRUBRIC' | 'CONTENT',
  scopeId?: string,
): Promise<RetrievalScope> {
  if (!scopeId || scope === 'GLOBAL') return {};
  if (scope === 'PILLAR') return { pillarId: scopeId };
  if (scope === 'SUBRUBRIC') return { subRubricId: scopeId };
  return { contentId: scopeId };
}

async function scopeHint(
  scope: 'GLOBAL' | 'PILLAR' | 'SUBRUBRIC' | 'CONTENT',
  scopeId?: string,
): Promise<string | null> {
  if (!scopeId || scope === 'GLOBAL') return null;
  try {
    if (scope === 'PILLAR') {
      const pillar = await prisma.pillar.findUnique({ where: { id: scopeId } });
      return pillar ? `L'internaute consulte la rubrique « ${pillar.title} ».` : null;
    }
    if (scope === 'SUBRUBRIC') {
      const sub = await prisma.subRubric.findUnique({
        where: { id: scopeId },
        include: { pillar: true },
      });
      return sub
        ? `L'internaute consulte la sous-rubrique « ${sub.title} » de la rubrique « ${sub.pillar.title} ».`
        : null;
    }
    const content = await prisma.content.findUnique({ where: { id: scopeId } });
    return content
      ? `L'internaute consulte l'enseignement « ${content.title} ». Priorise cet enseignement dans ta réponse.`
      : null;
  } catch {
    return null;
  }
}

async function persist(input: {
  userId: string | null;
  scope: string;
  scopeId: string | null;
  question: string;
  answer: string;
  sources: unknown;
}) {
  if (!input.answer.trim()) return;
  try {
    const conversation = await prisma.conversation.create({
      data: {
        userId: input.userId,
        scope: input.scope,
        scopeId: input.scopeId,
        title: input.question.slice(0, 90),
      },
    });
    await prisma.chatMessage.createMany({
      data: [
        { conversationId: conversation.id, role: 'user', content: input.question },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: input.answer,
          sources: JSON.stringify(input.sources),
        },
      ],
    });
  } catch (error) {
    // La journalisation ne doit jamais casser la réponse à l'internaute.
    console.warn('[ia/chat] journalisation impossible :', error);
  }
}
