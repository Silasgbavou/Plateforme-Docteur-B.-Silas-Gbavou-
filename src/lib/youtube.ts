/**
 * Intégration YouTube — métadonnées via l'API Data v3 et récupération
 * « meilleur effort » de la transcription automatique (endpoint timedtext).
 *
 * L'API officielle ne donne accès aux sous-titres qu'avec une autorisation
 * OAuth du propriétaire de la chaîne ; l'endpoint timedtext public couvre la
 * majorité des cas (sous-titres manuels puis ASR). En cas d'échec,
 * l'administrateur peut coller la transcription à la main : le module
 * d'import prévoit ce champ.
 */

export interface YouTubeVideo {
  youtubeId: string;
  title: string;
  description: string;
  publishedAt: Date | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
}

export function extractVideoId(input: string): string | null {
  const value = input.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.slice(1);
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    const v = url.searchParams.get('v');
    if (v && /^[\w-]{11}$/.test(v)) return v;
    const match = url.pathname.match(/\/(embed|shorts|live)\/([\w-]{11})/);
    if (match) return match[2];
  } catch {
    /* pas une URL */
  }
  return null;
}

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY n'est pas configurée sur le serveur.");
  return key;
}

export async function fetchVideo(youtubeId: string): Promise<YouTubeVideo> {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('id', youtubeId);
  url.searchParams.set('key', apiKey());

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`YouTube API ${response.status} : ${await response.text()}`);
  const json = (await response.json()) as { items?: RawVideo[] };
  const item = json.items?.[0];
  if (!item) throw new Error('Vidéo introuvable ou non publique.');
  return mapVideo(item);
}

/** Liste les dernières vidéos d'une chaîne (via sa playlist « uploads »). */
export async function fetchChannelVideos(
  channelId: string,
  max = 50,
): Promise<YouTubeVideo[]> {
  const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
  channelUrl.searchParams.set('part', 'contentDetails');
  channelUrl.searchParams.set('id', channelId);
  channelUrl.searchParams.set('key', apiKey());

  const channelResponse = await fetch(channelUrl, { cache: 'no-store' });
  if (!channelResponse.ok) {
    throw new Error(`YouTube API ${channelResponse.status} : ${await channelResponse.text()}`);
  }
  const channelJson = (await channelResponse.json()) as {
    items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
  };
  const uploads = channelJson.items?.[0]?.contentDetails.relatedPlaylists.uploads;
  if (!uploads) throw new Error('Chaîne introuvable.');

  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < max) {
    const listUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    listUrl.searchParams.set('part', 'contentDetails');
    listUrl.searchParams.set('playlistId', uploads);
    listUrl.searchParams.set('maxResults', String(Math.min(50, max - ids.length)));
    listUrl.searchParams.set('key', apiKey());
    if (pageToken) listUrl.searchParams.set('pageToken', pageToken);

    const listResponse = await fetch(listUrl, { cache: 'no-store' });
    if (!listResponse.ok) break;
    const listJson = (await listResponse.json()) as {
      items?: { contentDetails: { videoId: string } }[];
      nextPageToken?: string;
    };
    ids.push(...(listJson.items ?? []).map((i) => i.contentDetails.videoId));
    pageToken = listJson.nextPageToken;
    if (!pageToken) break;
  }

  const videos: YouTubeVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('id', batch.join(','));
    url.searchParams.set('key', apiKey());
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) continue;
    const json = (await response.json()) as { items?: RawVideo[] };
    videos.push(...(json.items ?? []).map(mapVideo));
  }
  return videos;
}

interface RawVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails?: Record<string, { url: string }>;
  };
  contentDetails: { duration: string };
}

function mapVideo(item: RawVideo): YouTubeVideo {
  const thumbs = item.snippet.thumbnails ?? {};
  const thumbnail =
    thumbs.maxres?.url ?? thumbs.standard?.url ?? thumbs.high?.url ?? thumbs.medium?.url ?? null;
  return {
    youtubeId: item.id,
    title: item.snippet.title,
    description: item.snippet.description ?? '',
    publishedAt: item.snippet.publishedAt ? new Date(item.snippet.publishedAt) : null,
    thumbnailUrl: thumbnail,
    durationSec: parseIsoDuration(item.contentDetails.duration),
  };
}

export function parseIsoDuration(value: string): number | null {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return null;
  const [, d, h, m, s] = match;
  return (
    Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0)
  );
}

// ───────────────────────────── Transcription ─────────────────────────────

/**
 * Récupération de la transcription automatique. Plusieurs stratégies sont
 * tentées successivement (sous-titres français manuels, ASR français, anglais).
 * Renvoie null si aucune piste n'est accessible.
 */
export async function fetchTranscript(youtubeId: string): Promise<string | null> {
  const attempts: Record<string, string>[] = [
    { lang: 'fr' },
    { lang: 'fr', kind: 'asr' },
    { lang: 'fr-FR' },
    { lang: 'fr-FR', kind: 'asr' },
    { lang: 'en', kind: 'asr' },
  ];

  for (const params of attempts) {
    const url = new URL('https://www.youtube.com/api/timedtext');
    url.searchParams.set('v', youtubeId);
    url.searchParams.set('fmt', 'json3');
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; PlateformeSGB/1.0)' },
      });
      if (!response.ok) continue;
      const raw = await response.text();
      if (!raw.trim()) continue;
      const text = parseJson3(raw);
      if (text && text.length > 120) return text;
    } catch {
      continue;
    }
  }
  return null;
}

function parseJson3(raw: string): string | null {
  try {
    const json = JSON.parse(raw) as {
      events?: { segs?: { utf8: string }[] }[];
    };
    const text = (json.events ?? [])
      .map((event) => (event.segs ?? []).map((seg) => seg.utf8).join(''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/\[\s*(Musique|Music|Applaudissements|Applause)\s*\]/gi, '')
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

export function youtubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

export function youtubeThumb(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}
