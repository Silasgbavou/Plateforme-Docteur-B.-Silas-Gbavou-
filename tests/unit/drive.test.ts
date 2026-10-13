import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { makePdf, TEST_PAGES } from "../fixtures/make-pdf";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: "sync@test.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) });
const FOLDER = "1eVNAgUtMHp8Op2qvXdseVWWVFIt0ggxI";

const { syncDrive, titleFromFileName } = await import("@/lib/server/drive");
const { seedCatalog } = await import("@/lib/server/catalog");
const { db } = await import("@/lib/server/db");

const pdfA = makePdf(TEST_PAGES);
const pdfNew = makePdf([["Contenu de test pour un nouveau titre."]]);

function fakeDrive(files: { id: string; name: string; md5: string; rev: string; data: Uint8Array; parents?: string[] }[]) {
  const calls: string[] = [];
  const impl = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("oauth2")) {
      expect(String(init?.body)).toContain("assertion=");
      return new Response(JSON.stringify({ access_token: "jeton" }));
    }
    expect((init?.headers as Record<string, string>).authorization).toBe("Bearer jeton");
    if (u.includes("alt=media")) {
      const id = decodeURIComponent(u.split("/files/")[1]!.split("?")[0]!);
      return new Response(new Blob([files.find((f) => f.id === id)!.data as BlobPart]));
    }
    expect(decodeURIComponent(u)).toContain(`'${FOLDER}' in parents`);
    return new Response(JSON.stringify({ files: files.map((f) => ({ id: f.id, name: f.name, size: String(f.data.length), md5Checksum: f.md5, headRevisionId: f.rev, modifiedTime: "2026-10-01T00:00:00Z", parents: f.parents ?? [FOLDER], mimeType: "application/pdf" })) }));
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("synchronisation Drive", () => {
  it("titre lisible depuis le nom de fichier", () => {
    expect(titleFromFileName("Les Partenaires de Dieu - Docteur B. Silas Gbavou.pdf")).toBe("Les Partenaires de Dieu");
    expect(titleFromFileName("Introduction au Royaume de la Puissance Docteur B. Silas Gbavou ")).toBe("Introduction au Royaume de la Puissance");
  });

  it("importe en brouillon, crée une œuvre à classer pour un inconnu, ignore un fichier hors dossier, puis est idempotente", async () => {
    seedCatalog();
    const files = [
      { id: "1KpKckrVHy5WxQ992tWxDI50jyBbMNaRM", name: "Les Sept montagnes d'une ville Docteur B. Silas Gbavou.pdf", md5: "m1", rev: "r1", data: pdfA },
      { id: "nouveauFichierDrive01", name: "Un nouveau titre - Docteur B. Silas Gbavou.pdf", md5: "m2", rev: "r1", data: pdfNew },
      { id: "fichierHorsDossier01", name: "Hors dossier.pdf", md5: "m3", rev: "r1", data: pdfNew, parents: ["autreDossier"] },
    ];
    const drive = fakeDrive(files);
    const r1 = await syncDrive(null, null, drive.impl);
    expect(r1).toMatchObject({ seen: 2, imported: 2, newWorks: 1, errors: [] });
    const eds = db().prepare("SELECT work_id AS w, status, drive_file_id AS f FROM editions ORDER BY w").all();
    expect(eds).toEqual([
      { w: "sept-montagnes", status: "brouillon", f: "1KpKckrVHy5WxQ992tWxDI50jyBbMNaRM" },
      { w: "un-nouveau-titre", status: "brouillon", f: "nouveauFichierDrive01" },
    ]);
    expect(db().prepare("SELECT status, pillar FROM works WHERE id = 'un-nouveau-titre'").get()).toEqual({ status: "a_classer", pillar: null });

    // Deuxième passage sans changement : aucun téléchargement
    const drive2 = fakeDrive(files);
    const r2 = await syncDrive(null, null, drive2.impl);
    expect(r2).toMatchObject({ imported: 0, unchanged: 2 });
    expect(drive2.calls.some((c) => c.includes("alt=media"))).toBe(false);

    // Nouvelle révision : nouvelle édition brouillon, l'ancienne n'est pas touchée
    files[0] = { ...files[0]!, md5: "m1b", rev: "r2", data: makePdf([["Texte de test revu."]]) };
    const r3 = await syncDrive(null, null, fakeDrive(files).impl);
    expect(r3.imported).toBe(1);
    expect((db().prepare("SELECT COUNT(*) AS n FROM editions WHERE work_id = 'sept-montagnes'").get() as { n: number }).n).toBe(2);
    expect((db().prepare("SELECT COUNT(*) AS n FROM editions WHERE status = 'publiee'").get() as { n: number }).n).toBe(0);
  });
});
