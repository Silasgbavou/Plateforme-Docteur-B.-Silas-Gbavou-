import "server-only";
import path from "node:path";

/**
 * Rend la première page d'un PDF en PNG (la vraie couverture de l'ouvrage), côté serveur.
 * Utilise le moteur de rendu de PDF.js avec @napi-rs/canvas. Retourne null si le rendu échoue :
 * la reliure typographique reste alors affichée, jamais une image inventée.
 */
export async function renderFirstPage(data: Uint8Array, targetWidth = 900): Promise<Buffer | null> {
  try {
    const { createCanvas } = await import("@napi-rs/canvas");
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = pdfjs.getDocument({
      data: new Uint8Array(data),
      disableFontFace: false,
      standardFontDataUrl: `${path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts")}${path.sep}`,
    });
    const doc = await task.promise;
    try {
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(4, targetWidth / base.width) });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;
      page.cleanup();
      return canvas.toBuffer("image/png");
    } finally {
      await task.destroy();
    }
  } catch {
    return null;
  }
}
