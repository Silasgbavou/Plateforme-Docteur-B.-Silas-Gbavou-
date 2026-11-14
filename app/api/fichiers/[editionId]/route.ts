import { getEdition, getWork } from "@/lib/server/catalog";
import { objectSize, objectStream } from "@/lib/server/storage";
import { currentReaderId, currentAdmin } from "@/lib/server/session";
import { readerOwnsDownload } from "@/lib/server/downloads";
import { ApiError, fail } from "@/lib/server/http";
import { Readable } from "node:stream";

/**
 * Politique de fichiers (à confirmer par le propriétaire, cf. docs/DECISIONS.md) :
 * - usage=lecture : octets servis à l'audience du site pour la liseuse (éditions publiées uniquement,
 *   ou toute édition pour l'administrateur). Le filigrane est un affichage, pas une protection.
 * - usage=telechargement : exige une demande enregistrée appartenant au lecteur (cookie signé).
 * Range HTTP pris en charge pour un chargement progressif.
 */
export async function GET(req: Request, ctx: { params: Promise<{ editionId: string }> }) {
  try {
    const { editionId } = await ctx.params;
    const url = new URL(req.url);
    const usage = url.searchParams.get("usage") === "telechargement" ? "telechargement" : "lecture";
    const edition = getEdition(editionId);
    if (!edition) throw new ApiError(404, "introuvable", "Fichier introuvable.");
    const admin = await currentAdmin();
    const work = getWork(edition.workId);
    const publicReadable = edition.status === "publiee" || edition.status === "remplacee";
    if (!admin && (!publicReadable || work?.status !== "publie")) throw new ApiError(404, "introuvable", "Fichier introuvable.");

    if (usage === "telechargement" && !admin) {
      const readerId = await currentReaderId();
      const requestId = url.searchParams.get("demande") ?? "";
      if (!readerId || !readerOwnsDownload(readerId, requestId, editionId)) {
        throw new ApiError(403, "demande_requise", "Le téléchargement nécessite une demande enregistrée depuis la fiche de l'ouvrage.");
      }
    }

    const size = await objectSize(edition.storageKey);
    if (size === null) throw new ApiError(404, "fichier_absent", "Le fichier de cette édition est absent du stockage.");
    const headers = new Headers({
      "content-type": "application/pdf",
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=3600",
      etag: `"${edition.sha256}"`,
      "x-content-type-options": "nosniff",
    });
    const filename = `${edition.workId}.pdf`;
    headers.set("content-disposition", `${usage === "telechargement" ? "attachment" : "inline"}; filename="${filename}"`);

    if (req.headers.get("if-none-match") === `"${edition.sha256}"`) return new Response(null, { status: 304, headers });

    const range = req.headers.get("range");
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!m || (m[1] === "" && m[2] === "")) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
      let start = m[1] === "" ? size - Number(m[2]) : Number(m[1]);
      let end = m[1] === "" || m[2] === "" ? size - 1 : Number(m[2]);
      start = Math.max(0, start);
      end = Math.min(size - 1, end);
      if (start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
      headers.set("content-range", `bytes ${start}-${end}/${size}`);
      headers.set("content-length", String(end - start + 1));
      return new Response(Readable.toWeb(objectStream(edition.storageKey, { start, end })) as ReadableStream, { status: 206, headers });
    }
    headers.set("content-length", String(size));
    return new Response(Readable.toWeb(objectStream(edition.storageKey)) as ReadableStream, { status: 200, headers });
  } catch (e) {
    return fail(e);
  }
}
