/** Synchronise le dossier Drive autorisé (éditions brouillon uniquement). */
import { syncDrive, driveConfigured } from "@/lib/server/drive";
import { seedCatalog } from "@/lib/server/catalog";

if (!driveConfigured()) {
  console.error("GOOGLE_SERVICE_ACCOUNT_JSON non configuré.");
  process.exit(1);
}
seedCatalog();
const r = await syncDrive(null, null);
console.log(`Fichiers vus ${r.seen} · inchangés ${r.unchanged} · brouillons créés ${r.imported} · œuvres à classer ${r.newWorks}`);
for (const e of r.errors) console.error(`Erreur : ${e}`);
console.log("Lancez `pnpm worker --once` pour l'extraction, puis contrôlez et publiez dans /gestion/catalogue.");
