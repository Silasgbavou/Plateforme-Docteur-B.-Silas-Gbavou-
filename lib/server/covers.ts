import "server-only";
import sharp from "sharp";
import { db } from "./db";
import { putObject } from "./storage";
import { sha256 } from "./ids";

const MAX = 8 * 1024 * 1024;

function isImage(b: Uint8Array) {
  const jpeg = b[0] === 0xff && b[1] === 0xd8;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const webp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45;
  return jpeg || png || webp;
}

/** Couverture réelle : signature vérifiée, ré-encodée en WebP 900 px max (métadonnées EXIF retirées). */
export async function saveCover(workId: string, data: Uint8Array) {
  if (data.byteLength > MAX) throw new Error("Image trop volumineuse (8 Mo maximum).");
  if (!isImage(data)) throw new Error("Format non reconnu : JPEG, PNG ou WebP attendu.");
  const out = await sharp(data, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 900, height: 1350, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const key = `couvertures/${workId}-${sha256(out.data).slice(0, 16)}.webp`;
  await putObject(key, out.data).catch((e: NodeJS.ErrnoException) => { if (e.code !== "EEXIST") throw e; });
  db().prepare("UPDATE works SET cover_key = ?, cover_width = ?, cover_height = ? WHERE id = ?").run(key, out.info.width, out.info.height, workId);
}
