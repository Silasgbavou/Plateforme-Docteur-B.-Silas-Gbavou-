import { getWork } from "@/lib/server/catalog";
import { getObject } from "@/lib/server/storage";
import { fail, ApiError } from "@/lib/server/http";

export async function GET(_req: Request, ctx: { params: Promise<{ workId: string }> }) {
  try {
    const { workId } = await ctx.params;
    const work = getWork(workId);
    if (!work?.coverKey) throw new ApiError(404, "introuvable", "Couverture introuvable.");
    const data = await getObject(work.coverKey);
    return new Response(new Uint8Array(data), {
      headers: { "content-type": "image/webp", "cache-control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  } catch (e) {
    return fail(e);
  }
}
