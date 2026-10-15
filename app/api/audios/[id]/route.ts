import { Readable } from "node:stream";
import { getAudio } from "@/lib/server/audios";
import { currentAdmin } from "@/lib/server/session";
import { objectSize, objectStream } from "@/lib/server/storage";
import { ApiError, fail } from "@/lib/server/http";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const a = getAudio(id);
    if (!a || (a.status !== "publie" && !(await currentAdmin()))) throw new ApiError(404, "introuvable", "Audio introuvable.");
    const size = await objectSize(a.storageKey);
    if (size === null) throw new ApiError(404, "fichier_absent", "Fichier absent.");
    const headers = new Headers({ "content-type": a.mime, "accept-ranges": "bytes", "cache-control": "private, max-age=3600" });
    const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.get("range") ?? "");
    if (m) {
      const start = Number(m[1]);
      const end = Math.min(size - 1, m[2] ? Number(m[2]) : size - 1);
      if (start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
      headers.set("content-range", `bytes ${start}-${end}/${size}`);
      headers.set("content-length", String(end - start + 1));
      return new Response(Readable.toWeb(objectStream(a.storageKey, { start, end })) as ReadableStream, { status: 206, headers });
    }
    headers.set("content-length", String(size));
    return new Response(Readable.toWeb(objectStream(a.storageKey)) as ReadableStream, { headers });
  } catch (e) {
    return fail(e);
  }
}
