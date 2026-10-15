import { currentAdmin } from "@/lib/server/session";
import { listDownloads, type DownloadRow } from "@/lib/server/downloads";
import { audit } from "@/lib/server/audit";
import { ApiError, fail } from "@/lib/server/http";

/** Export complet (pagination interne). Neutralise les formules tableur (=, +, -, @). */
function cell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    const admin = await currentAdmin();
    if (!admin) throw new ApiError(401, "non_autorise", "Authentification requise.");
    const cols: (keyof DownloadRow)[] = ["createdAt", "title", "editionLabel", "lastName", "firstName", "church", "whatsapp", "email", "motivation", "discovery", "consentVersion"];
    const lines = [cols.join(";")];
    let cursor: { createdAt: string; id: string } | undefined;
    for (;;) {
      const rows = listDownloads(500, cursor);
      for (const r of rows) lines.push(cols.map((c) => cell(r[c])).join(";"));
      if (rows.length < 500) break;
      const last = rows[rows.length - 1]!;
      cursor = { createdAt: last.createdAt, id: last.id };
    }
    audit(admin.email, "telechargements.export", undefined, { lignes: lines.length - 1 });
    return new Response("﻿" + lines.join("\r\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="demandes-ouvrages-${new Date().toISOString().slice(0, 10)}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
