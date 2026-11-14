export const CHUNKER_VERSION = "page-para-v1";

export interface Chunk {
  text: string;
  start: number;
  end: number;
}

/**
 * Découpage conservateur d'une page : paragraphes puis phrases, jamais au milieu d'un mot.
 * Les passages ne franchissent pas la limite de page (citations à page exacte).
 * Les offsets permettent de retrouver le texte exact dans la page.
 */
export function chunkPage(text: string, target = 900, max = 1400): Chunk[] {
  const chunks: Chunk[] = [];
  if (!text.trim()) return chunks;
  const units: { start: number; end: number }[] = [];
  const re = /[^\n]+(?:\n(?!\n)[^\n]+)*/g; // paragraphes séparés par une ligne vide
  for (let m = re.exec(text); m; m = re.exec(text)) {
    splitLong(m.index, m.index + m[0].length, text, max, units);
  }
  let curStart = -1;
  let curEnd = -1;
  for (const u of units) {
    if (curStart < 0) {
      curStart = u.start;
      curEnd = u.end;
    } else if (u.end - curStart <= target || curEnd - curStart < target / 3) {
      if (u.end - curStart > max) {
        chunks.push(make(text, curStart, curEnd));
        curStart = u.start;
      }
      curEnd = u.end;
    } else {
      chunks.push(make(text, curStart, curEnd));
      curStart = u.start;
      curEnd = u.end;
    }
  }
  if (curStart >= 0) chunks.push(make(text, curStart, curEnd));
  return chunks.filter((c) => c.text.length >= 20);
}

function make(text: string, start: number, end: number): Chunk {
  return { text: text.slice(start, end).trim(), start, end };
}

function splitLong(start: number, end: number, text: string, max: number, out: { start: number; end: number }[]) {
  if (end - start <= max) {
    out.push({ start, end });
    return;
  }
  // Découpe par phrases.
  const sentenceEnd = /[.!?»;:](?=\s)/g;
  let s = start;
  let lastCut = start;
  sentenceEnd.lastIndex = start;
  for (let m = sentenceEnd.exec(text); m && m.index < end; m = sentenceEnd.exec(text)) {
    const cut = m.index + 1;
    if (cut - s > max * 0.6) {
      out.push({ start: s, end: cut });
      s = cut;
    }
    lastCut = cut;
  }
  void lastCut;
  // Reste : coupe aux espaces si nécessaire.
  while (end - s > max) {
    let cut = text.lastIndexOf(" ", s + max);
    if (cut <= s) cut = s + max;
    out.push({ start: s, end: cut });
    s = cut;
  }
  if (end > s) out.push({ start: s, end });
}
