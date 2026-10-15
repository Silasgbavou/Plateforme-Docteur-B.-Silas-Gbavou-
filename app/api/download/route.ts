import { downloadRequestSchema } from "@/lib/domain/download-schema";
import { ApiError, fail, ok, readJson, zodFields } from "@/lib/server/http";
import { assertSameOrigin, clientKey, rateLimit } from "@/lib/server/security";
import { ensureReaderId } from "@/lib/server/session";
import { recordDownloadRequest } from "@/lib/server/downloads";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    rateLimit(`download:${clientKey(req)}`, 10, 600);
    const parsed = downloadRequestSchema.safeParse(await readJson(req, 16_000));
    if (!parsed.success) {
      throw new ApiError(422, "validation", "Certains champs sont à corriger.", false, undefined, zodFields(parsed.error));
    }
    const readerId = await ensureReaderId();
    const result = recordDownloadRequest(readerId, parsed.data);
    return ok(
      {
        requestId: result.id,
        replay: result.replay,
        downloadUrl: `/api/fichiers/${result.editionId}?usage=telechargement&demande=${result.id}`,
      },
      { status: result.replay ? 200 : 201 },
    );
  } catch (e) {
    return fail(e);
  }
}
