import { z } from "zod";
import { ApiError, fail, readJson, zodFields } from "@/lib/server/http";
import { assertSameOrigin, rateLimit } from "@/lib/server/security";
import { ensureReaderId } from "@/lib/server/session";
import { requestId } from "@/lib/server/ids";
import { runStudy } from "@/lib/server/study/engine";
import { getWork } from "@/lib/server/catalog";
import type { StudyEvent } from "@/lib/domain/study-types";

const bodySchema = z.object({
  question: z.string().transform((s) => s.trim()).pipe(z.string().min(3, "Question trop courte.").max(1200, "Question trop longue (1 200 caractères maximum).")),
  threadId: z.string().uuid(),
  context: z.enum(["textes", "predications"]).default("textes"),
  workId: z.string().regex(/^[a-z0-9-]{2,80}$/).nullable().optional(),
});

export const dynamic = "force-dynamic";

/**
 * Flux SSE : status → sources → answer → done (ou error). La réponse n'est émise
 * qu'APRÈS validation des citations : aucune citation provisoire n'est présentée comme preuve.
 * La fermeture de la connexion annule réellement la génération en cours.
 */
export async function POST(req: Request) {
  let readerId: string;
  let input: z.infer<typeof bodySchema>;
  try {
    assertSameOrigin(req);
    const parsed = bodySchema.safeParse(await readJson(req, 8_000));
    if (!parsed.success) throw new ApiError(422, "validation", "Question invalide.", false, undefined, zodFields(parsed.error));
    input = parsed.data;
    readerId = await ensureReaderId();
    rateLimit(`etude:${readerId}`, 12, 60);
    if (input.workId) {
      const w = getWork(input.workId);
      if (!w || w.status !== "publie") input.workId = null;
    }
  } catch (e) {
    return fail(e);
  }

  const rid = requestId();
  const encoder = new TextEncoder();
  let seq = 0;
  const controller = new AbortController();
  req.signal.addEventListener("abort", () => controller.abort(), { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          ctrl.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const emit = (e: StudyEvent) => write(`id: ${rid}-${++seq}\nevent: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`);
      write(`retry: 5000\n: ouverture ${rid}\n\n`);
      const heartbeat = setInterval(() => write(`: battement\n\n`), 12_000);
      try {
        await runStudy({
          question: input.question,
          threadId: input.threadId,
          readerId,
          context: input.context,
          workId: input.workId ?? null,
          requestId: rid,
          signal: controller.signal,
          emit,
        });
      } catch {
        emit({ event: "error", data: { code: "erreur_interne", message: "Une erreur inattendue est survenue.", retryable: true } });
      } finally {
        clearInterval(heartbeat);
        closed = true;
        try {
          ctrl.close();
        } catch {
          /* déjà fermé */
        }
      }
    },
    cancel() {
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
      "x-request-id": rid,
    },
  });
}
