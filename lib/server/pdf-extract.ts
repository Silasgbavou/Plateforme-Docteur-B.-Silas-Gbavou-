import "server-only";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

/**
 * Extraction du texte côté serveur, page par page, depuis les octets réels du fichier
 * (et non depuis un texte soumis par le navigateur). Aucune correction ni complétion :
 * une page sans couche texte reste vide et est comptée comme « à OCR ».
 */
export async function extractPdfPages(data: Uint8Array, onPage?: (n: number, total: number) => void): Promise<{ pageCount: number; pages: ExtractedPage[] }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    disableFontFace: true,
    useSystemFonts: false,
  });
  const doc = await task.promise;
  const pages: ExtractedPage[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text += item.str;
        text += item.hasEOL ? "\n" : "";
      }
      pages.push({ pageNumber: n, text: normalizePageText(text) });
      page.cleanup();
      onPage?.(n, doc.numPages);
    }
    return { pageCount: doc.numPages, pages };
  } finally {
    await task.destroy();
  }
}

/** Normalisation conservatrice : espaces et césures de fin de ligne uniquement. */
export function normalizePageText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isPdf(data: Uint8Array): boolean {
  return data.length > 5 && data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46 && data[4] === 0x2d;
}
