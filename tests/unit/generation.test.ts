import { beforeAll, describe, expect, it, vi } from "vitest";

// Configuration AVANT le premier accès à env() : fournisseur simulé, aucune requête réelle.
process.env.LLM_PROVIDER = "gemini";
process.env.GEMINI_API_KEY = "cle-de-test";
process.env.GEMINI_MODELS = "modele-a,modele-b";
process.env.GEMINI_API_BASE = "https://llm.test/v1beta";

const { seedCatalog } = await import("@/lib/server/catalog");
const { importEditionFile, publishEdition } = await import("@/lib/server/editions");
const { runOnce } = await import("@/lib/server/worker");
const { runStudy } = await import("@/lib/server/study/engine");
const { db } = await import("@/lib/server/db");
const { makePdf, TEST_PAGES } = await import("../fixtures/make-pdf");
import type { StudyEvent } from "@/lib/domain/study-types";

const realFetch = globalThis.fetch;

beforeAll(async () => {
  seedCatalog();
  const r = await importEditionFile({ workId: "royaume-puissance", label: "Test", data: makePdf(TEST_PAGES), sourceKind: "depot" });
  await runOnce("w", new AbortController().signal);
  publishEdition(r.editionId, "test");
  db().prepare("INSERT INTO readers (id) VALUES ('r')").run();
});

function modelReply(payload: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(status === 200 ? JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }) : "err", { status, headers });
}

async function ask(question: string) {
  const events: StudyEvent[] = [];
  await runStudy({ question, threadId: "00000000-0000-4000-8000-0000000000aa", readerId: "r", context: "textes", workId: null, requestId: "x", signal: new AbortController().signal, emit: (e) => events.push(e) });
  const a = events.find((e) => e.event === "answer");
  return a?.event === "answer" ? a.data.answer : null;
}

describe("génération sourcée (fournisseur simulé)", () => {
  it("publie seulement les citations vérifiées, avec repli après 404", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(String(url));
      if (String(url).includes("modele-a")) return new Response("not found", { status: 404 });
      const body = JSON.parse(String(init?.body)) as { contents: { parts: { text: string }[] }[]; systemInstruction: { parts: { text: string }[] } };
      // Les sources sont transmises comme données encadrées, la consigne injectée y figure sans autorité.
      expect(body.contents[0]!.parts[0]!.text).toContain("<source id=\"S1\"");
      expect(body.systemInstruction.parts[0]!.text).toContain("pas le Docteur lui-même");
      return modelReply({
        suffisance: "suffisante",
        sections: { fondement: "La patience est présentée comme féconde [S1].", ecritures: "Selon Jean 3:16, tout est dit.", ancrage: "Voir [S1].", application: "Cultiver la patience." },
        citations: [
          { source: "S1", extrait: "La patience du jardinier produit des fleurs abondantes" },
          { source: "S1", extrait: "Le jardinier récolte cent fois plus que ce qu'il a semé" },
        ],
        relances: [{ question: "Que disent les sources sur les étoiles ?", sources: ["S1"] }],
        limites: "",
      });
    }));
    const a = await ask("Que dit le texte sur la patience du jardinier ?");
    vi.stubGlobal("fetch", realFetch);
    expect(calls.some((c) => c.includes("modele-a"))).toBe(true);
    expect(a).toMatchObject({ kind: "reponse", model: "modele-b" });
    expect(a!.citations).toHaveLength(1); // la citation inventée est retirée
    expect(a!.sections!.ecritures).toBe(""); // verset absent des sources retiré
    expect(a!.limites).toMatch(/bibliques/);
  });

  it("tous les modèles indisponibles : passages conservés, synthèse indisponible honnête", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 404 })));
    const a = await ask("Que dit le texte sur les étoiles et les marins ?");
    vi.stubGlobal("fetch", realFetch);
    expect(a!.kind).toBe("indisponible");
    expect(a!.notice).toMatch(/indisponible/);
  });

  it("réponse non vérifiable (texte libre) : non affichée", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Bien sûr ! Voici une réponse libre." }] } }] }), { status: 200 })));
    const a = await ask("Que dit le texte sur la lumière du matin ?");
    vi.stubGlobal("fetch", realFetch);
    expect(a!.kind).toBe("indisponible");
    expect(a!.sections).toBeUndefined();
  });

  it("le budget global protège le fournisseur (questions plafonnées par minute)", async () => {
    const { acquireLlmSlot } = await import("@/lib/server/llm/budget");
    const results = Array.from({ length: 40 }, () => acquireLlmSlot("question"));
    expect(results.some((r) => !r.ok)).toBe(true);
  });
});
