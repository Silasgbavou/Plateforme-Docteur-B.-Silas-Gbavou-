import { describe, expect, it } from "vitest";
import { cleanSegment, cleanWithIntegrity, detectFormat, groupSegments, parseTranscript, parseYouTubeId } from "@/lib/server/transcripts";
import { chunkPage } from "@/lib/server/chunker";
import { buildFtsQuery } from "@/lib/server/study/retrieval";

const SRT = `1
00:00:01,000 --> 00:00:04,000
Bonjour à tous

2
00:00:04,000 --> 00:00:07,500
<i>Ouvrons ensemble</i> le texte

3
00:00:04,000 --> 00:00:07,500
<i>Ouvrons ensemble</i> le texte
`;

const VTT = `WEBVTT

00:01:02.000 --> 00:01:05.000
Amen, alléluia, euh nous commençons

01:00:00.000 --> 01:00:03.000
fin`;

describe("transcriptions", () => {
  it("détecte le format", () => {
    expect(detectFormat(SRT)).toBe("srt");
    expect(detectFormat(VTT)).toBe("vtt");
    expect(detectFormat("Un simple texte.\n\nDeuxième paragraphe.")).toBe("texte_brut");
  });
  it("analyse SRT (balises retirées, doublons consécutifs fusionnés)", () => {
    const { cues } = parseTranscript(SRT);
    expect(cues).toEqual([
      { start: 1, end: 4, text: "Bonjour à tous" },
      { start: 4, end: 7.5, text: "Ouvrons ensemble le texte" },
    ]);
  });
  it("analyse VTT avec heures", () => {
    const { cues } = parseTranscript(VTT);
    expect(cues[0]!.start).toBe(62);
    expect(cues[1]!.start).toBe(3600);
  });
  it("texte brut : AUCUN repère temporel inventé", () => {
    const { cues } = parseTranscript("Premier paragraphe.\n\nSecond paragraphe.");
    expect(cues.every((c) => c.start === null && c.end === null)).toBe(true);
    expect(groupSegments(cues).every((c) => c.start === null)).toBe(true);
  });
  it("nettoyage : retire les tics, conserve Amen et Alléluia", () => {
    const out = cleanSegment("Amen, alléluia, euh nous nous commençons");
    expect(out).toContain("Amen");
    expect(out).toContain("alléluia");
    expect(out).not.toMatch(/\beuh\b/);
    expect(out).toContain("nous commençons");
  });
  it("contrôle d'intégrité : conserve le texte épuré quand aucun mot significatif n'est perdu", () => {
    const r = cleanWithIntegrity("euh la grâce la grâce de Dieu");
    expect(r.cleaned).toBe(true);
    expect(r.text).toBe("la grâce la grâce de Dieu");
  });
});

describe("URL YouTube (anti-SSRF)", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("accepte %s", (url, id) => expect(parseYouTubeId(url)).toBe(id));
  it.each([
    "https://evil.example/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "http://169.254.169.254/latest/meta-data",
    "file:///etc/passwd",
    "https://www.youtube.com/watch?v=trop-court",
    "javascript:alert(1)",
  ])("refuse %s", (url) => expect(parseYouTubeId(url)).toBeNull());
});

describe("découpage et requête lexicale", () => {
  it("ne coupe pas les mots et conserve les offsets", () => {
    const text = Array.from({ length: 40 }, (_, i) => `Phrase numéro ${i} qui parle de lumière et de patience.`).join(" ");
    const chunks = chunkPage(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(text.slice(c.start, c.end).trim()).toBe(c.text);
      expect(c.text.length).toBeLessThanOrEqual(1400);
    }
  });
  it("page vide : aucun passage", () => expect(chunkPage("   ")).toEqual([]));
  it("requête FTS sûre (pas d'opérateurs injectés)", () => {
    const q = buildFtsQuery('Que dit-il sur la prière ? "NEAR" OR * -- ) (');
    expect(q).toBe('"priere" OR "near"');
    expect(buildFtsQuery("et de la")).toBeNull();
  });
});
