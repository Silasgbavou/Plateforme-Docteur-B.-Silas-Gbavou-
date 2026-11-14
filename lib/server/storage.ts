import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

/**
 * Stockage d'objets. Implémentation : système de fichiers local HORS de /public,
 * servi uniquement par des routes qui appliquent la politique d'accès.
 * Un adaptateur S3/R2 peut implémenter la même interface (non fourni ici).
 */
function root() {
  return path.resolve(env().STORAGE_DIR);
}

function resolveKey(key: string) {
  if (!/^[a-z0-9][a-z0-9/_.-]{0,200}$/i.test(key) || key.includes("..")) throw new Error("Clé de stockage invalide");
  const full = path.resolve(root(), key);
  if (!full.startsWith(root() + path.sep)) throw new Error("Clé de stockage hors racine");
  return full;
}

export async function putObject(key: string, data: Buffer | Uint8Array) {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  const tmp = `${full}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, data, { flag: "wx" });
  await rename(tmp, full); // écriture atomique
}

export async function getObject(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

export async function objectSize(key: string): Promise<number | null> {
  try {
    return (await stat(resolveKey(key))).size;
  } catch {
    return null;
  }
}

export function objectStream(key: string, range?: { start: number; end: number }) {
  return createReadStream(resolveKey(key), range);
}
