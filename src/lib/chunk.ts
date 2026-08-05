/**
 * Découpage du corpus en fragments (chunks) pour le RAG.
 *
 * Stratégie : on respecte d'abord les frontières naturelles (titres, paragraphes,
 * phrases) puis on regroupe jusqu'à ~1 100 caractères avec un recouvrement de
 * ~150 caractères. Le recouvrement évite de couper une idée en deux et améliore
 * nettement le rappel sur les transcriptions parlées, peu ponctuées.
 */

export interface ChunkPiece {
  index: number;
  text: string;
  heading?: string;
}

const TARGET = 1100;
const OVERLAP = 150;
const MIN_CHUNK = 220;

export function chunkText(raw: string, documentTitle?: string): ChunkPiece[] {
  const text = normalizeWhitespace(raw);
  if (!text) return [];

  const blocks = splitIntoBlocks(text);
  const pieces: ChunkPiece[] = [];
  let buffer = '';
  let heading = documentTitle;

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed.length >= MIN_CHUNK || (trimmed.length > 0 && pieces.length === 0)) {
      pieces.push({ index: pieces.length, text: trimmed, heading });
      buffer = tail(trimmed, OVERLAP);
    } else if (trimmed.length > 0) {
      // Fragment résiduel : on le rattache au précédent plutôt que de le perdre.
      const last = pieces[pieces.length - 1];
      if (last) last.text = `${last.text}\n${trimmed}`.slice(0, TARGET * 2);
      else pieces.push({ index: 0, text: trimmed, heading });
      buffer = '';
    }
  };

  for (const block of blocks) {
    if (block.isHeading) {
      if (buffer.trim().length >= MIN_CHUNK) flush();
      heading = block.text.replace(/^#+\s*/, '').trim() || heading;
      buffer = buffer ? `${buffer}\n\n${block.text}` : block.text;
      continue;
    }

    for (const sentence of splitSentences(block.text)) {
      if (buffer.length + sentence.length + 1 > TARGET && buffer.trim().length > 0) {
        flush();
      }
      buffer = buffer ? `${buffer} ${sentence}` : sentence;
      // Une phrase isolée plus longue que la cible : on la coupe durement.
      while (buffer.length > TARGET * 1.8) {
        const cut = buffer.slice(0, TARGET);
        pieces.push({ index: pieces.length, text: cut.trim(), heading });
        buffer = buffer.slice(TARGET - OVERLAP);
      }
    }
    buffer += '\n';
  }

  if (buffer.trim().length > 0) {
    const trimmed = buffer.trim();
    if (trimmed.length >= MIN_CHUNK || pieces.length === 0) {
      pieces.push({ index: pieces.length, text: trimmed, heading });
    } else {
      const last = pieces[pieces.length - 1];
      if (last) last.text = `${last.text}\n${trimmed}`;
    }
  }

  return pieces.map((p, i) => ({ ...p, index: i }));
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitIntoBlocks(text: string): { text: string; isHeading: boolean }[] {
  return text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => ({ text: b, isHeading: /^#{1,4}\s+/.test(b) || (b.length < 90 && /^[A-ZÉÈÀÙÎÔ0-9][^.?!]*$/.test(b)) }));
}

function splitSentences(block: string): string[] {
  const parts = block
    .split(/(?<=[.!?…»])\s+(?=[«"A-ZÉÈÀÙÎÔ0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [block];
}

function tail(text: string, size: number): string {
  if (text.length <= size) return '';
  const slice = text.slice(-size);
  const space = slice.indexOf(' ');
  return (space > -1 ? slice.slice(space + 1) : slice) + ' ';
}

/** Estimation rapide du nombre de tokens (≈ 4 caractères par token en français). */
export function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
