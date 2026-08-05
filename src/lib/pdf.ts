import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

import { resolveStoredPath } from '@/lib/storage';
import { SITE } from '@/lib/site';

/**
 * Protection des livres PDF.
 *
 * Principe : le téléchargement personnel est autorisé — c'est une demande
 * explicite du ministère — mais chaque exemplaire est **nominatif et traçable**.
 * Concrètement, à chaque téléchargement on produit à la volée une copie qui
 * porte :
 *   1. une page de licence en tête, au nom du destinataire ;
 *   2. un filigrane diagonal discret sur chaque page ;
 *   3. un pied de page « Tous droits réservés » avec le code de licence ;
 *   4. des métadonnées PDF verrouillées (auteur, copyright, mot-clé de licence).
 *
 * La revente ou la rediffusion d'un exemplaire devient donc directement
 * imputable au compte qui l'a téléchargé, ce qui dissuade beaucoup plus
 * efficacement qu'un simple verrou technique — lequel serait de toute façon
 * contournable dès lors que le fichier est téléchargeable.
 */

export interface LicenseInfo {
  licenseCode: string;
  recipientName: string;
  recipientEmail: string;
  bookTitle: string;
  issuedAt: Date;
}

export function newLicenseCode(): string {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `SGB-${stamp}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function buildLicensedPdf(
  relativePath: string,
  license: LicenseInfo,
): Promise<Uint8Array> {
  const bytes = await readFile(resolveStoredPath(relativePath));
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dateFr = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(license.issuedAt);

  // ── 1. Page de licence, insérée en tête ──
  const first = pdf.getPageCount() > 0 ? pdf.getPage(0) : null;
  const width = first?.getWidth() ?? 595.28;
  const height = first?.getHeight() ?? 841.89;
  const cover = pdf.insertPage(0, [width, height]);

  const margin = 56;
  let y = height - margin - 20;

  const write = (
    text: string,
    options: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {},
  ) => {
    const size = options.size ?? 11;
    const font = options.bold ? helveticaBold : helvetica;
    const [r, g, b] = options.color ?? [0.12, 0.14, 0.22];
    for (const line of wrapText(sanitize(text), font, size, width - margin * 2)) {
      cover.drawText(line, { x: margin, y, size, font, color: rgb(r, g, b) });
      y -= size + 5;
    }
    y -= options.gap ?? 8;
  };

  write(SITE.name.toUpperCase(), { size: 20, bold: true, color: [0.05, 0.07, 0.13], gap: 2 });
  write('Docteur de la Parole et de la Saine Doctrine — Homme Prophetique', {
    size: 10,
    color: [0.42, 0.44, 0.52],
    gap: 22,
  });

  cover.drawRectangle({
    x: margin,
    y: y - 2,
    width: width - margin * 2,
    height: 2,
    color: rgb(0.79, 0.56, 0.11),
  });
  y -= 30;

  write('LICENCE PERSONNELLE DE LECTURE', { size: 15, bold: true, gap: 14 });
  write(`Ouvrage : ${license.bookTitle}`, { size: 12, bold: true });
  write(`Delivree a : ${license.recipientName} (${license.recipientEmail})`, { size: 11 });
  write(`Code de licence : ${license.licenseCode}`, { size: 11, bold: true });
  write(`Date de delivrance : ${dateFr} (UTC)`, { size: 11, gap: 20 });

  write('CONDITIONS D\'UTILISATION', { size: 13, bold: true, gap: 10 });
  for (const clause of LICENSE_CLAUSES) {
    write(`•  ${clause}`, { size: 10.5, color: [0.2, 0.22, 0.3], gap: 2 });
  }

  y -= 14;
  write(
    `Cet exemplaire est nominatif. Le code ${license.licenseCode} permet d'identifier le compte a l'origine de toute copie diffusee sans autorisation.`,
    { size: 10, color: [0.55, 0.24, 0.12], gap: 14 },
  );
  write(`Contact : ${SITE.email} — ${SITE.phoneDisplay}`, { size: 10, color: [0.42, 0.44, 0.52] });

  cover.drawText(sanitize(`(c) ${license.issuedAt.getFullYear()} ${SITE.name} — ${SITE.copyright}`), {
    x: margin,
    y: margin,
    size: 9,
    font: helveticaBold,
    color: rgb(0.45, 0.47, 0.55),
  });

  // ── 2. Filigrane + pied de page sur chaque page du livre ──
  const footer = sanitize(
    `${SITE.copyright} — ${SITE.name} — Licence ${license.licenseCode} — ${license.recipientEmail} — Revente interdite`,
  );
  const watermark = sanitize(`${license.recipientEmail} · ${license.licenseCode}`);

  const pages = pdf.getPages();
  for (let i = 1; i < pages.length; i += 1) {
    const page = pages[i];
    const pw = page.getWidth();
    const ph = page.getHeight();

    page.drawText(watermark, {
      x: pw * 0.14,
      y: ph * 0.32,
      size: Math.max(14, Math.min(26, pw / 24)),
      font: helvetica,
      color: rgb(0.55, 0.58, 0.68),
      opacity: 0.1,
      rotate: degrees(34),
    });

    const footerSize = 6.5;
    const footerWidth = helvetica.widthOfTextAtSize(footer, footerSize);
    page.drawText(footer, {
      x: Math.max(12, (pw - footerWidth) / 2),
      y: 12,
      size: footerSize,
      font: helvetica,
      color: rgb(0.5, 0.52, 0.6),
      opacity: 0.75,
    });
  }

  // ── 3. Métadonnées ──
  pdf.setTitle(sanitize(license.bookTitle));
  pdf.setAuthor(sanitize(SITE.name));
  pdf.setSubject(sanitize(`${SITE.copyright} — usage personnel — revente interdite`));
  pdf.setProducer(sanitize(`Plateforme ${SITE.name}`));
  pdf.setCreator(sanitize(`Plateforme ${SITE.name}`));
  pdf.setKeywords([
    sanitize(SITE.copyright),
    `licence:${license.licenseCode}`,
    `titulaire:${license.recipientEmail}`,
    'revente-interdite',
  ]);
  pdf.setModificationDate(license.issuedAt);

  return pdf.save({ useObjectStreams: true });
}

export const LICENSE_CLAUSES = [
  "Usage strictement personnel : lecture, etude et meditation par le titulaire de la licence.",
  "Toute revente, location, mise a disposition payante ou monetisation, sous quelque forme que ce soit, est formellement interdite.",
  "Toute reproduction, rediffusion, mise en ligne ou distribution massive sans autorisation ecrite prealable est interdite.",
  "La citation d'extraits est autorisee dans un cadre d'enseignement non commercial, a condition de mentionner l'auteur et le titre de l'ouvrage.",
  "Le retrait, la modification ou l'alteration du present filigrane et des mentions de licence constitue une violation caracterisee des droits d'auteur.",
];

/** pdf-lib + polices standard : on retire les caractères hors WinAnsi. */
function sanitize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapText(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Nombre de pages d'un PDF, pour l'affichage de la fiche livre. */
export async function countPages(buffer: Buffer): Promise<number | null> {
  try {
    const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return pdf.getPageCount();
  } catch {
    return null;
  }
}
