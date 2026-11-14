/**
 * Importe un PDF local comme ÉDITION BROUILLON d'une œuvre (aucune publication automatique).
 *   pnpm edition:import <workId> <chemin.pdf> [--label "Édition 2026"] [--drive <fileId>]
 * Le fichier est copié dans STORAGE_DIR (hors /public), identifié par SHA-256 ;
 * l'extraction est confiée au worker (`pnpm worker`).
 */
import { readFile } from "node:fs/promises";
import { importEditionFile } from "@/lib/server/editions";
import { seedCatalog } from "@/lib/server/catalog";

const [workId, file] = process.argv.slice(2);
const flag = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
if (!workId || !file) {
  console.error("Usage : pnpm edition:import <workId> <fichier.pdf> [--label ...] [--drive <fileId>]");
  process.exit(1);
}
seedCatalog();
const data = new Uint8Array(await readFile(file));
const driveFileId = flag("--drive");
const res = await importEditionFile({
  workId,
  label: flag("--label") ?? `Édition importée le ${new Date().toISOString().slice(0, 10)}`,
  data,
  sourceKind: driveFileId ? "drive" : "depot",
  driveFileId: driveFileId ?? null,
});
console.log(res.duplicate ? `Déjà importé : édition ${res.editionId}` : `Édition ${res.editionId} créée (brouillon), tâche ${res.jobId}`);
