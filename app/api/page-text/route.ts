import { getEdition, getPageText, getWork } from "@/lib/server/catalog";
import { currentAdmin } from "@/lib/server/session";
import { ApiError, fail, ok } from "@/lib/server/http";

/** Texte extrait d'une page (alternative accessible au rendu canvas). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const editionId = url.searchParams.get("edition") ?? "";
    const page = Number(url.searchParams.get("page"));
    const edition = getEdition(editionId);
    if (!edition || !Number.isInteger(page) || page < 1 || page > edition.pageCount) throw new ApiError(404, "introuvable", "Page introuvable.");
    const work = getWork(edition.workId);
    const admin = await currentAdmin();
    if (!admin && (work?.status !== "publie" || !(edition.status === "publiee" || edition.status === "remplacee"))) {
      throw new ApiError(404, "introuvable", "Page introuvable.");
    }
    return ok({ page, text: getPageText(editionId, page) ?? "" });
  } catch (e) {
    return fail(e);
  }
}
