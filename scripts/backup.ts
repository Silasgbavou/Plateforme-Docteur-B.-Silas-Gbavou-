/**
 * Sauvegarde cohérente : base SQLite (API de sauvegarde en ligne, sans arrêt) + objets du stockage,
 * avec manifeste SHA-256. Le chiffrement et l'envoi hors site sont à faire par l'outil de l'hébergeur
 * (ex. `age`, `gpg`, coffre objet chiffré) : ce script ne prétend pas chiffrer.
 *   pnpm backup [dossier-cible]
 */
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = process.env.DATABASE_PATH ?? "./data/ministere.sqlite";
const storage = process.env.STORAGE_DIR ?? "./storage";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.resolve(process.argv[2] ?? path.join("backups", stamp));
mkdirSync(target, { recursive: true });

const src = new Database(dbPath, { readonly: true });
await src.backup(path.join(target, "ministere.sqlite"));
src.close();
if (existsSync(storage)) cpSync(storage, path.join(target, "storage"), { recursive: true });

const files: Record<string, string> = {};
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name !== "MANIFEST.json") files[path.relative(target, full)] = createHash("sha256").update(readFileSync(full)).digest("hex");
  }
};
walk(target);
writeFileSync(path.join(target, "MANIFEST.json"), JSON.stringify({ createdAt: new Date().toISOString(), files }, null, 2));
console.log(`Sauvegarde : ${target} (${Object.keys(files).length} fichiers)`);
