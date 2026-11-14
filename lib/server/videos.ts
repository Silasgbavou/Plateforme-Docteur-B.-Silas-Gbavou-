import "server-only";
import { db } from "./db";
import { newId, nowIso, sha256 } from "./ids";
import { cleanWithIntegrity, groupSegments, parseTranscript } from "./transcripts";
import { CHUNKER_VERSION } from "./chunker";
import { enqueue } from "./jobs";
import { embeddingConfigured, embeddingSpace } from "./embeddings";

export interface TeachingVideo {
  id: string;
  title: string;
  pillar: string | null;
  theme: string | null;
  status: "brouillon" | "publiee" | "retiree";
  transcriptSource: string | null;
  timed: number;
  teachingStartSec: number | null;
  teachingStartProvenance: string | null;
  createdAt: string;
}

const COLS = `id, title, pillar, theme, status, transcript_source AS transcriptSource, timed,
  teaching_start_sec AS teachingStartSec, teaching_start_provenance AS teachingStartProvenance, created_at AS createdAt`;

/**
 * Titre via l'endpoint oEmbed officiel. L'URL appelée est reconstruite à partir de l'ID validé,
 * jamais celle fournie par l'utilisateur (anti-SSRF).
 */
export async function fetchYouTubeTitle(videoId: string): Promise<string | null> {
  try {
    const watch = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`, {
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return typeof data.title === "string" ? data.title.slice(0, 300) : null;
  } catch {
    return null;
  }
}

export function upsertVideoDraft(id: string, title: string) {
  db().prepare(
    `INSERT INTO teaching_videos (id, title, status) VALUES (?, ?, 'brouillon')
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = ?`,
  ).run(id, title, nowIso());
}

/**
 * Enregistre une transcription fournie (SRT / VTT / texte brut). Remplace les segments d'une vidéo
 * brouillon uniquement. Les minutes ne sont jamais inventées pour un texte non horodaté.
 */
export function attachTranscript(videoId: string, input: string) {
  const { format, cues } = parseTranscript(input);
  if (!cues.length) throw new Error("Transcription vide ou illisible.");
  const segments = groupSegments(cues);
  const d = db();
  d.transaction(() => {
    const v = d.prepare("SELECT status, pillar FROM teaching_videos WHERE id = ?").get(videoId) as { status: string; pillar: string | null } | undefined;
    if (!v) throw new Error("Vidéo inconnue.");
    if (v.status === "publiee") throw new Error("Vidéo publiée : repassez-la en brouillon avant de remplacer la transcription.");
    d.prepare("DELETE FROM passages WHERE video_id = ?").run(videoId);
    d.prepare("DELETE FROM video_segments WHERE video_id = ?").run(videoId);
    const insSeg = d.prepare("INSERT INTO video_segments (id, video_id, seq, start_sec, end_sec, raw_text, clean_text) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const insPassage = d.prepare(
      `INSERT INTO passages (id, source_type, video_id, start_sec, end_sec, pillar, text, text_sha256, chunker_version) VALUES (?, 'video', ?, ?, ?, ?, ?, ?, ?)`,
    );
    segments.forEach((s, i) => {
      const { text } = cleanWithIntegrity(s.text);
      insSeg.run(newId(), videoId, i, s.start, s.end, s.text, text);
      insPassage.run(newId(), videoId, s.start, s.end, v.pillar, text, sha256(text), `video-${CHUNKER_VERSION}`);
    });
    const timed = format !== "texte_brut";
    d.prepare(
      `UPDATE teaching_videos SET transcript_source = ?, timed = ?, teaching_start_sec = NULL, teaching_start_provenance = NULL, updated_at = ? WHERE id = ?`,
    ).run(format, timed ? 1 : 0, nowIso(), videoId);
  })();
  if (embeddingConfigured()) enqueue("passages.embed", { space: embeddingSpace() }, `passages.embed:${embeddingSpace()}`);
  return { format, segments: segments.length };
}

/** Repère de début : seulement à partir d'un segment horodaté existant (provenance enregistrée). */
export function setTeachingStart(videoId: string, segmentSeq: number | null, actor: string) {
  const d = db();
  if (segmentSeq === null) {
    d.prepare("UPDATE teaching_videos SET teaching_start_sec = NULL, teaching_start_provenance = NULL WHERE id = ?").run(videoId);
    return;
  }
  const seg = d.prepare("SELECT start_sec AS start FROM video_segments WHERE video_id = ? AND seq = ?").get(videoId, segmentSeq) as { start: number | null } | undefined;
  if (!seg || seg.start == null) throw new Error("Ce segment n'a pas de repère temporel source : aucun badge de début ne peut être publié.");
  d.prepare("UPDATE teaching_videos SET teaching_start_sec = ?, teaching_start_provenance = ? WHERE id = ?").run(
    Math.floor(seg.start),
    `segment ${segmentSeq} de la transcription source, choisi par ${actor}`,
    videoId,
  );
}

export function updateVideoMeta(videoId: string, meta: { title: string; pillar: string; theme: string | null; status: "brouillon" | "publiee" | "retiree" }) {
  const d = db();
  d.transaction(() => {
    if (meta.status === "publiee") {
      const n = d.prepare("SELECT COUNT(*) AS n FROM video_segments WHERE video_id = ?").get(videoId) as { n: number };
      if (n.n === 0) throw new Error("Aucune transcription : publication refusée.");
    }
    const res = d.prepare("UPDATE teaching_videos SET title = ?, pillar = ?, theme = ?, status = ?, updated_at = ? WHERE id = ?").run(meta.title, meta.pillar, meta.theme, meta.status, nowIso(), videoId);
    if (!res.changes) throw new Error("Vidéo inconnue.");
    d.prepare("UPDATE passages SET pillar = ? WHERE video_id = ?").run(meta.pillar, videoId);
  })();
}

export function listVideos(publishedOnly: boolean): TeachingVideo[] {
  return db().prepare(`SELECT ${COLS} FROM teaching_videos ${publishedOnly ? "WHERE status = 'publiee'" : ""} ORDER BY created_at DESC LIMIT 200`).all() as TeachingVideo[];
}

export function getVideo(id: string): TeachingVideo | null {
  return (db().prepare(`SELECT ${COLS} FROM teaching_videos WHERE id = ?`).get(id) as TeachingVideo | undefined) ?? null;
}

export function listSegments(videoId: string) {
  return db().prepare("SELECT seq, start_sec AS startSec, end_sec AS endSec, raw_text AS rawText, clean_text AS cleanText FROM video_segments WHERE video_id = ? ORDER BY seq").all(videoId) as {
    seq: number; startSec: number | null; endSec: number | null; rawText: string; cleanText: string;
  }[];
}
