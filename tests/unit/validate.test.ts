import { describe, expect, it } from "vitest";
import { normalizeForMatch, validateAnswer } from "@/lib/server/study/validate";

const sources = new Map([
  ["S1", "La patience du jardinier produit des fleurs abondantes au printemps, selon Jean 3:16 cité ici."],
  ["S2", "Les marins observent les étoiles pour retrouver leur chemin dans la nuit."],
]);

const answer = (o: Record<string, unknown>) =>
  JSON.stringify({
    suffisance: "suffisante",
    sections: { fondement: "Fondement [S1].", ecritures: "", ancrage: "Ancrage [S2].", application: "" },
    citations: [],
    relances: [],
    limites: "",
    ...o,
  });

describe("validateAnswer", () => {
  it("accepte une citation contiguë exacte (normalisation espaces/casse/apostrophes)", () => {
    const r = validateAnswer(answer({ citations: [{ source: "S2", extrait: "les marins  observent les ÉTOILES pour retrouver" }] }), sources);
    // NB : la casse est normalisée, pas les accents : « ÉTOILES » ≠ « étoiles » en minuscules ? toLowerCase gère É→é.
    expect(r.citations).toHaveLength(1);
    expect(r.suffisance).toBe("suffisante");
  });

  it("rejette une citation inventée, trop courte ou attribuée à la mauvaise source", () => {
    const r = validateAnswer(
      answer({
        citations: [
          { source: "S1", extrait: "le jardinier plante des arbres fruitiers chaque hiver" },
          { source: "S1", extrait: "fleurs abondantes" },
          { source: "S1", extrait: "Les marins observent les étoiles pour retrouver" },
          { source: "S9", extrait: "Les marins observent les étoiles pour retrouver" },
        ],
      }),
      sources,
    );
    expect(r.citations).toHaveLength(0);
    expect(r.rejected.citations).toBe(4);
    expect(r.suffisance).toBe("insuffisante");
    expect(r.limites).toMatch(/Aucun extrait/);
  });

  it("retire les références [Sx] inconnues", () => {
    const r = validateAnswer(answer({ sections: { fondement: "Affirmation [S7] et [S1].", ecritures: "", ancrage: "", application: "" }, citations: [{ source: "S1", extrait: "La patience du jardinier produit des fleurs" }] }), sources);
    expect(r.sections.fondement).not.toContain("[S7]");
    expect(r.sections.fondement).toContain("[S1]");
    expect(r.rejected.references).toBe(1);
  });

  it("retire les versets absents des sources et conserve ceux présents", () => {
    const r = validateAnswer(
      answer({
        sections: { fondement: "", ecritures: "Comme le rapporte Jean 3:16 dans la source [S1]. Romains 8:28 affirme aussi cela.", ancrage: "", application: "" },
        citations: [{ source: "S1", extrait: "La patience du jardinier produit des fleurs" }],
      }),
      sources,
    );
    expect(r.sections.ecritures).toContain("Jean 3:16");
    expect(r.sections.ecritures).not.toContain("Romains 8:28");
    expect(r.rejected.versets).toBe(1);
    expect(r.limites).toMatch(/bibliques/);
  });

  it("ne garde que les relances appuyées sur des sources fournies, deux au maximum", () => {
    const r = validateAnswer(
      answer({
        citations: [{ source: "S1", extrait: "La patience du jardinier produit des fleurs" }],
        relances: [
          { question: "Que dit la source sur les étoiles ?", sources: ["S2"] },
          { question: "Question sans appui documentaire ?", sources: [] },
          { question: "Question appuyée sur une source inconnue ?", sources: ["S5"] },
          { question: "Que dit la source sur le printemps ?", sources: ["S1"] },
          { question: "Une troisième relance valide ?", sources: ["S1"] },
        ],
      }),
      sources,
    );
    expect(r.relances.map((x) => x.question)).toEqual(["Que dit la source sur les étoiles ?", "Que dit la source sur le printemps ?"]);
  });

  it("échoue proprement sur une sortie non JSON", () => {
    expect(() => validateAnswer("Je ne peux pas répondre.", sources)).toThrow();
  });

  it("normalise apostrophes et guillemets typographiques", () => {
    expect(normalizeForMatch("L’Église « glorieuse »")).toBe(normalizeForMatch("L'Église \"glorieuse\""));
  });
});
