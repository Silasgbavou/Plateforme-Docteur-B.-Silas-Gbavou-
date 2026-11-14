import { z } from "zod";
import { fail, ok, ApiError } from "@/lib/server/http";
import { assertSameOrigin } from "@/lib/server/security";
import { currentReaderId } from "@/lib/server/session";
import { deleteThreads, listThread, listThreads } from "@/lib/server/study/engine";

/** Historique d'étude du lecteur courant uniquement (identité = cookie signé, jamais un ID fourni seul). */
export async function GET(req: Request) {
  try {
    const readerId = await currentReaderId();
    const thread = new URL(req.url).searchParams.get("fil");
    if (!readerId) return ok({ threads: [], exchanges: [] }, { headers: { "cache-control": "no-store" } });
    if (thread) {
      if (!z.string().uuid().safeParse(thread).success) throw new ApiError(400, "fil_invalide", "Fil invalide.");
      return ok({ exchanges: listThread(readerId, thread) }, { headers: { "cache-control": "no-store" } });
    }
    return ok({ threads: listThreads(readerId) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const readerId = await currentReaderId();
    if (!readerId) return ok({ deleted: 0 });
    const thread = new URL(req.url).searchParams.get("fil") ?? undefined;
    if (thread && !z.string().uuid().safeParse(thread).success) throw new ApiError(400, "fil_invalide", "Fil invalide.");
    return ok({ deleted: deleteThreads(readerId, thread) });
  } catch (e) {
    return fail(e);
  }
}
