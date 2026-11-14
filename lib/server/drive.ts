import "server-only";
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { db } from "./db";
import { env } from "./env";
import { nowIso } from "./ids";
import { importEditionFile, MAX_PDF_BYTES } from "./editions";
import { AUTHOR } from "@/lib/domain/catalog-seed";
import { slugify } from "./articles";
import { heartbeat, RetryLaterError, type Job } from "./jobs";

/**
 * Synchronisation du SEUL dossier Drive autorisé, en lecture seule (scope drive.readonly),
 * via un compte de service auquel le propriétaire a partagé ce dossier.
 * - Ne modifie jamais les partages ni les fichiers Drive.
 * - Crée uniquement des éditions BROUILLON ; la publication reste une décision humaine.
 * - Un fichier inconnu crée une œuvre « à classer », sans pilier.
 */
interface ServiceAccount { client_email: string; private_key: string; token_uri?: string }

export interface DriveFile { id: string; name: string; size?: string; md5Checksum?: string; modifiedTime?: string; headRevisionId?: string; parents?: string[]; mimeType: string }

export function driveConfigured(): boolean {
  return Boolean(env().GOOGLE_SERVICE_ACCOUNT_JSON);
}

function serviceAccount(): ServiceAccount {
  const raw = env().GOOGLE_SERVICE_ACCOUNT_JSON!;
  const text = raw.trim().startsWith("{") ? raw : raw.endsWith(".json") ? readFileSync(raw, "utf8") : Buffer.from(raw, "base64").toString("utf8");
  const sa = JSON.parse(text) as ServiceAccount;
  if (!sa.client_email || !sa.private_key) throw new Error("Compte de service Drive invalide.");
  return sa;
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

export async function driveAccessToken(fetchImpl: typeof fetch = fetch): Promise<string> {
  const sa = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/drive.readonly", aud: sa.token_uri ?? "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(sa.private_key).toString("base64url");
  const res = await fetchImpl(sa.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${signature}` }),
  });
  if (!res.ok) throw new Error(`Authentification Drive refusée (HTTP ${res.status}).`);
  return ((await res.json()) as { access_token: string }).access_token;
}

const API = "https://www.googleapis.com/drive/v3";

async function driveFetch(url: string, token: string, fetchImpl: typeof fetch) {
  const res = await fetchImpl(url, { headers: { authorization: `Bearer ${token}` }, redirect: "follow" });
  if (res.status === 429 || res.status >= 500) throw new RetryLaterError(`Drive indisponible (HTTP ${res.status}).`, 120_000);
  if (res.status === 403 || res.status === 404) throw new Error(`Accès Drive refusé (HTTP ${res.status}) : le dossier est-il partagé avec le compte de service ?`);
  if (!res.ok) throw new Error(`Erreur Drive HTTP ${res.status}.`);
  return res;
}

export async function listFolderPdfs(token: string, fetchImpl: typeof fetch = fetch): Promise<DriveFile[]> {
  const folder = env().DRIVE_FOLDER_ID;
  const out: DriveFile[] = [];
  let pageToken = "";
  do {
    const q = encodeURIComponent(`'${folder}' in parents and trashed = false and mimeType = 'application/pdf'`);
    const fields = encodeURIComponent("nextPageToken, files(id, name, size, md5Checksum, modifiedTime, headRevisionId, parents, mimeType)");
    const res = await driveFetch(`${API}/files?q=${q}&fields=${fields}&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true${pageToken ? `&pageToken=${pageToken}` : ""}`, token, fetchImpl);
    const data = (await res.json()) as { files: DriveFile[]; nextPageToken?: string };
    // Défense en profondeur : ne garder que les fichiers dont le parent est bien le dossier autorisé.
    out.push(...data.files.filter((f) => f.parents?.includes(folder) && f.mimeType === "application/pdf"));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

/** Titre lisible à partir du nom de fichier (pour une œuvre nouvelle « à classer », modifiable ensuite). */
export function titleFromFileName(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[-–—/]?\s*(Docteur|Dr\.?)\s+B\.?\s+Silas\s+Gbavou\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim() || name;
}

export interface SyncReport { seen: number; unchanged: number; imported: number; newWorks: number; errors: string[] }

export async function syncDrive(job: Job | null, owner: string | null, fetchImpl: typeof fetch = fetch): Promise<SyncReport> {
  const token = await driveAccessToken(fetchImpl);
  const files = await listFolderPdfs(token, fetchImpl);
  const d = db();
  const report: SyncReport = { seen: files.length, unchanged: 0, imported: 0, newWorks: 0, errors: [] };
  let i = 0;
  for (const f of files) {
    i++;
    if (job && owner) heartbeat(job, owner, { done: i - 1, total: files.length });
    const known = d.prepare("SELECT work_id AS workId, md5_checksum AS md5 FROM drive_sources WHERE file_id = ?").get(f.id) as { workId: string; md5: string | null } | undefined;
    const hasEdition = d.prepare("SELECT 1 FROM editions WHERE drive_file_id = ? AND (drive_revision_id IS ? OR drive_revision_id = ?)").get(f.id, f.headRevisionId ?? null, f.headRevisionId ?? "");
    if (known && hasEdition && known.md5 === (f.md5Checksum ?? null)) {
      d.prepare("UPDATE drive_sources SET last_synced_at = ?, last_status = 'inchange' WHERE file_id = ?").run(nowIso(), f.id);
      report.unchanged++;
      continue;
    }
    try {
      if (Number(f.size ?? 0) > MAX_PDF_BYTES) throw new Error("Fichier trop volumineux.");
      let workId = known?.workId;
      if (!workId) {
        const title = titleFromFileName(f.name);
        workId = slugify(title);
        if (d.prepare("SELECT 1 FROM works WHERE id = ?").get(workId)) workId = `${workId}-${f.id.slice(0, 6).toLowerCase()}`;
        d.prepare("INSERT INTO works (id, title, author, pillar, theme, status, sort_order) VALUES (?, ?, ?, NULL, NULL, 'a_classer', 1000)").run(workId, title, AUTHOR);
        report.newWorks++;
      }
      const res = await driveFetch(`${API}/files/${encodeURIComponent(f.id)}?alt=media&supportsAllDrives=true`, token, fetchImpl);
      const data = new Uint8Array(await res.arrayBuffer());
      const r = await importEditionFile({
        workId, data, sourceKind: "drive", driveFileId: f.id, driveRevisionId: f.headRevisionId ?? null,
        label: `Drive — révision du ${(f.modifiedTime ?? nowIso()).slice(0, 10)}`,
      });
      d.prepare(
        `INSERT INTO drive_sources (file_id, work_id, name, size_bytes, modified_time, revision_id, md5_checksum, last_synced_at, last_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(file_id) DO UPDATE SET name = excluded.name, size_bytes = excluded.size_bytes, modified_time = excluded.modified_time,
           revision_id = excluded.revision_id, md5_checksum = excluded.md5_checksum, last_synced_at = excluded.last_synced_at, last_status = excluded.last_status`,
      ).run(f.id, workId, f.name, Number(f.size ?? 0), f.modifiedTime ?? null, f.headRevisionId ?? null, f.md5Checksum ?? null, nowIso(), r.duplicate ? "identique" : "brouillon_cree");
      if (!r.duplicate) report.imported++;
      else report.unchanged++;
    } catch (e) {
      if (e instanceof RetryLaterError) throw e;
      const msg = `${f.name} : ${(e as Error).message}`;
      report.errors.push(msg);
      d.prepare("UPDATE drive_sources SET last_synced_at = ?, last_status = ? WHERE file_id = ?").run(nowIso(), `erreur : ${(e as Error).message}`.slice(0, 200), f.id);
    }
  }
  d.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('drive.dernier_rapport', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(JSON.stringify({ ...report, at: nowIso() }), nowIso());
  if (report.errors.length && report.imported === 0 && report.unchanged === 0) throw new Error(report.errors.join(" ; "));
  return report;
}

export function lastDriveReport(): (SyncReport & { at: string }) | null {
  const row = db().prepare("SELECT value FROM settings WHERE key = 'drive.dernier_rapport'").get() as { value: string } | undefined;
  return row ? JSON.parse(row.value) : null;
}

