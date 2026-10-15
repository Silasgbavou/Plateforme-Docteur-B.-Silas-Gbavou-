import "server-only";
import { db } from "./db";
import { newId, nowIso, sha256 } from "./ids";
import { putObject } from "./storage";

export const MAX_AUDIO_BYTES = 60 * 1024 * 1024;

/** Signature de conteneur : Ogg (« OggS », .opus WhatsApp), MP3 (ID3 / trame), M4A (ftyp). */
export function sniffAudio(b: Uint8Array): string | null {
  if (b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return "audio/ogg";
  if ((b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && ((b[1] ?? 0) & 0xe0) === 0xe0)) return "audio/mpeg";
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "audio/mp4";
  return null;
}

export interface Audio { id: string; title: string; pillar: string; theme: string | null; mime: string; byteSize: number; transcript: string | null; status: string; createdAt: string; storageKey: string; originalName: string }
const COLS = "id, title, pillar, theme, mime, byte_size AS byteSize, transcript, status, created_at AS createdAt, storage_key AS storageKey, original_name AS originalName";

/** L'original est conservé tel quel ; aucune conversion n'est faite ici (cf. limites documentées). */
export async function saveAudio(input: { title: string; pillar: string; theme: string | null; data: Uint8Array; originalName: string }) {
  if (input.data.byteLength > MAX_AUDIO_BYTES) throw new Error("Fichier trop volumineux (60 Mo maximum).");
  const mime = sniffAudio(input.data);
  if (!mime) throw new Error("Format audio non reconnu (Opus/Ogg de WhatsApp, MP3 ou M4A attendus).");
  const digest = sha256(input.data);
  if (db().prepare("SELECT 1 FROM audios WHERE sha256 = ?").get(digest)) throw new Error("Ce fichier audio est déjà enregistré.");
  const ext = mime === "audio/ogg" ? "ogg" : mime === "audio/mpeg" ? "mp3" : "m4a";
  const key = `audios/${digest}.${ext}`;
  await putObject(key, input.data).catch((e: NodeJS.ErrnoException) => { if (e.code !== "EEXIST") throw e; });
  const id = newId();
  db().prepare("INSERT INTO audios (id, title, pillar, theme, storage_key, original_name, mime, byte_size, sha256, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'brouillon')").run(
    id, input.title, input.pillar, input.theme, key, input.originalName.slice(0, 200), mime, input.data.byteLength, digest,
  );
  return id;
}

export function listAudios(publishedOnly: boolean): Audio[] {
  return db().prepare(`SELECT ${COLS} FROM audios ${publishedOnly ? "WHERE status = 'publie'" : ""} ORDER BY created_at DESC LIMIT 200`).all() as Audio[];
}

export function getAudio(id: string): Audio | null {
  return (db().prepare(`SELECT ${COLS} FROM audios WHERE id = ?`).get(id) as Audio | undefined) ?? null;
}

export function setAudioStatus(id: string, status: "brouillon" | "publie", transcript: string | null) {
  db().prepare("UPDATE audios SET status = ?, transcript = ?, published_at = CASE WHEN ? = 'publie' THEN COALESCE(published_at, ?) ELSE NULL END WHERE id = ?").run(status, transcript, status, nowIso(), id);
}
