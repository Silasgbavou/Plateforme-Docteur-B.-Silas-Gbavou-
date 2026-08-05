import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Stockage des fichiers hors racine web.
 *
 * Les livres PDF et les audios ne sont JAMAIS servis en statique : ils
 * transitent par une route API qui vérifie la session, journalise l'accès et,
 * pour les PDF, appose la licence nominative. C'est le premier verrou du
 * dispositif anti-piratage.
 */

export const AUDIO_EXTENSIONS = ['.opus', '.ogg', '.oga', '.m4a', '.mp3', '.wav', '.webm'] as const;

/** Types MIME acceptés pour les audios, dont le format natif WhatsApp (.opus). */
export const AUDIO_MIME_TYPES = [
  'audio/ogg',
  'audio/opus',
  'audio/ogg; codecs=opus',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/webm',
  'application/octet-stream', // WhatsApp expédie parfois ce type générique
] as const;

export function storageRoot(): string {
  return path.resolve(process.env.STORAGE_DIR || './storage');
}

export function resolveStoredPath(relative: string): string {
  const root = storageRoot();
  const full = path.resolve(root, relative);
  // Verrou anti-traversée : le chemin résolu doit rester sous la racine.
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error('Chemin de fichier invalide.');
  }
  return full;
}

export async function saveBuffer(
  buffer: Buffer,
  options: { folder: 'audio' | 'books' | 'covers'; originalName: string },
): Promise<{ relativePath: string; size: number; checksum: string }> {
  const ext = sanitizeExtension(path.extname(options.originalName));
  const name = `${new Date().toISOString().slice(0, 10)}-${randomUUID()}${ext}`;
  const relative = path.join(options.folder, name);
  const full = resolveStoredPath(relative);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer);
  return {
    relativePath: relative.split(path.sep).join('/'),
    size: buffer.byteLength,
    checksum: createHash('sha256').update(buffer).digest('hex').slice(0, 32),
  };
}

function sanitizeExtension(ext: string): string {
  const clean = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
  return /^\.[a-z0-9]{1,6}$/.test(clean) ? clean : '';
}

export function audioMimeFor(fileName: string, provided?: string | null): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.opus' || ext === '.ogg' || ext === '.oga') return 'audio/ogg';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.webm') return 'audio/webm';
  return provided && provided !== 'application/octet-stream' ? provided : 'audio/ogg';
}

/**
 * Transcription audio optionnelle via un point d'accès HTTP compatible
 * multipart (champ « file »), renvoyant un JSON { text: "..." }.
 * Non configuré → l'administrateur colle la transcription manuellement.
 */
export async function transcribeAudio(
  buffer: Buffer,
  fileName: string,
  mime: string,
): Promise<string | null> {
  const endpoint = process.env.TRANSCRIPTION_ENDPOINT;
  if (!endpoint) return null;

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mime }), fileName);
  if (process.env.TRANSCRIPTION_MODEL) form.append('model', process.env.TRANSCRIPTION_MODEL);
  form.append('language', 'fr');

  const headers: Record<string, string> = {};
  if (process.env.TRANSCRIPTION_API_KEY) {
    headers.authorization = `Bearer ${process.env.TRANSCRIPTION_API_KEY}`;
  }

  try {
    const response = await fetch(endpoint, { method: 'POST', body: form, headers });
    if (!response.ok) {
      console.warn('[transcription] échec HTTP', response.status, await response.text());
      return null;
    }
    const json = (await response.json()) as { text?: string };
    return json.text?.trim() || null;
  } catch (error) {
    console.warn('[transcription] indisponible :', error);
    return null;
  }
}
