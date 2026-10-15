import { z } from "zod";
import { ApiError, fail, ok, readJson, zodFields } from "@/lib/server/http";
import { assertSameOrigin, rateLimit } from "@/lib/server/security";
import { currentReaderId, ensureReaderId } from "@/lib/server/session";
import { conversationForReader, decodeCursor, listMessages, postReaderMessage } from "@/lib/server/messages";

/** Le lecteur ne voit QUE sa conversation : l'identité vient du cookie signé, aucun ID n'est accepté du client. */
export async function GET(req: Request) {
  try {
    const readerId = await currentReaderId();
    const conv = readerId ? conversationForReader(readerId) : null;
    if (!conv) return ok({ conversation: null, messages: [], nextCursor: null }, { headers: { "cache-control": "no-store" } });
    const before = decodeCursor(new URL(req.url).searchParams.get("avant"));
    const page = listMessages(conv.id, 30, before);
    return ok({ conversation: { displayName: conv.displayName }, ...page }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail(e);
  }
}

const postSchema = z.object({
  body: z.string().transform((s) => s.trim()).pipe(z.string().min(1, "Message vide.").max(4000, "4 000 caractères maximum.")),
  clientId: z.string().uuid(),
  displayName: z.string().transform((s) => s.trim()).pipe(z.string().min(2, "Votre nom est requis.").max(120)).optional(),
  contact: z.string().transform((s) => s.trim()).pipe(z.string().max(160)).optional(),
});

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const parsed = postSchema.safeParse(await readJson(req, 16_000));
    if (!parsed.success) throw new ApiError(422, "validation", "Message invalide.", false, undefined, zodFields(parsed.error));
    const readerId = await ensureReaderId();
    rateLimit(`messages:${readerId}`, 20, 600);
    const message = postReaderMessage(readerId, { ...parsed.data, contact: parsed.data.contact || null });
    return ok({ message }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
