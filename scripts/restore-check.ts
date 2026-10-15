/**
 * Vérifie une sauvegarde dans un environnement isolé : empreintes, intégrité SQLite, comptages,
 * et présence de chaque fichier d'édition référencé. N'écrase JAMAIS la base de production.
 *   pnpm restore:check <dossier-de-sauvegarde>
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dir = path.resolve(process.argv[2] ?? "");
const manifest = JSON.parse(readFileSync(path.join(dir, "MANIFEST.json"), "utf8")) as { files: Record<string, string> };
let errors = 0;
for (const [rel, sum] of Object.entries(manifest.files)) {
  const full = path.join(dir, rel);
  if (!existsSync(full) || createHash("sha256").update(readFileSync(full)).digest("hex") !== sum) {
    console.error(`Empreinte invalide : ${rel}`);
    errors++;
  }
}
const db = new Database(path.join(dir, "ministere.sqlite"), { readonly: true });
const integrity = (db.prepare("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check;
if (integrity !== "ok") { console.error(`Intégrité SQLite : ${integrity}`); errors++; }
for (const t of ["works", "editions", "passages", "download_requests", "conversations", "messages", "etude_conversations", "jobs"]) {
  console.log(`${t.padEnd(22)} ${(db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n}`);
}
for (const e of db.prepare("SELECT id, storage_key AS k, sha256 FROM editions").all() as { id: string; k: string; sha256: string }[]) {
  const f = path.join(dir, "storage", e.k);
  if (!existsSync(f) || createHash("sha256").update(readFileSync(f)).digest("hex") !== e.sha256) {
    console.error(`Fichier d'édition manquant ou altéré : ${e.id}`);
    errors++;
  }
}
db.close();
console.log(errors ? `ÉCHEC : ${errors} problème(s)` : "Sauvegarde vérifiée : restauration possible.");
process.exit(errors ? 1 : 0);
