import { describe, expect, it, vi } from "vitest";
import { generateWithFallback } from "@/lib/server/llm/fallback";
import { classifyHttpError, LlmError, parseRetryAfter } from "@/lib/server/llm/errors";
import { geminiProvider, type ProviderCall } from "@/lib/server/llm/providers";
import { sanitizeError } from "@/lib/server/jobs";

const req = () => ({ system: "s", user: "u", json: true, signal: new AbortController().signal });
const noSleep = vi.fn(async () => undefined);

function fake(provider: "gemini" | "openai", model: string, outcomes: (string | LlmError)[]): ProviderCall & { calls: number } {
  const p = {
    provider, model, calls: 0,
    async generate() {
      const o = outcomes[Math.min(p.calls, outcomes.length - 1)]!;
      p.calls++;
      if (o instanceof LlmError) throw o;
      return o;
    },
  };
  return p;
}

describe("generateWithFallback", () => {
  it("réessaie une fois le même modèle après 503 en respectant Retry-After", async () => {
    const sleep = vi.fn(async () => undefined);
    const a = fake("gemini", "m1", [new LlmError("surcharge", "503", 2000), "ok"]);
    const r = await generateWithFallback([a], req(), { maxCalls: 4, maxWaitMs: 8000, sleep, random: () => 0 });
    expect(r).toMatchObject({ text: "ok", model: "m1", calls: 2 });
    expect(sleep).toHaveBeenCalledWith(2000, expect.anything());
  });

  it("passe au modèle suivant si Retry-After dépasse l'attente maximale, avec une pause", async () => {
    const sleep = vi.fn(async () => undefined);
    const a = fake("gemini", "m1", [new LlmError("surcharge", "429", 60_000)]);
    const b = fake("gemini", "m2", ["ok"]);
    const r = await generateWithFallback([a, b], req(), { maxCalls: 4, maxWaitMs: 8000, sleep, random: () => 0 });
    expect(r.model).toBe("m2");
    expect(a.calls).toBe(1);
    expect(sleep).toHaveBeenCalledTimes(1); // pause anti-tempête, pas l'attente de 60 s
  });

  it("modèle retiré (404) : modèle suivant sans attente", async () => {
    const a = fake("gemini", "retire", [new LlmError("modele_indisponible", "404")]);
    const b = fake("gemini", "m2", ["ok"]);
    const r = await generateWithFallback([a, b], req(), { maxCalls: 4, maxWaitMs: 8000, sleep: noSleep });
    expect(r.model).toBe("m2");
  });

  it("clé invalide ou quota journalier : n'insiste pas sur le même fournisseur", async () => {
    const a = fake("gemini", "m1", [new LlmError("cle_invalide", "401")]);
    const b = fake("gemini", "m2", ["ok"]);
    await expect(generateWithFallback([a, b], req(), { maxCalls: 4, maxWaitMs: 8000, sleep: noSleep })).rejects.toMatchObject({ kind: "cle_invalide" });
    expect(b.calls).toBe(0);
  });

  it("repli inter-fournisseur seulement si la chaîne le contient", async () => {
    const a = fake("gemini", "m1", [new LlmError("quota_journalier", "429 per day")]);
    const b = fake("openai", "o1", ["ok"]);
    const r = await generateWithFallback([a, b], req(), { maxCalls: 4, maxWaitMs: 8000, sleep: noSleep });
    expect(r.provider).toBe("openai");
  });

  it("borne le nombre total d'appels réels", async () => {
    const chain = [1, 2, 3, 4, 5].map((i) => fake("gemini", `m${i}`, [new LlmError("surcharge", "503", 10)]));
    await expect(generateWithFallback(chain, req(), { maxCalls: 3, maxWaitMs: 8000, sleep: noSleep })).rejects.toBeInstanceOf(LlmError);
    expect(chain.reduce((n, c) => n + c.calls, 0)).toBe(3);
  });

  it("annulation : arrêt immédiat", async () => {
    const a = fake("gemini", "m1", [new LlmError("annule", "abort")]);
    const b = fake("gemini", "m2", ["ok"]);
    await expect(generateWithFallback([a, b], req(), { maxCalls: 4, maxWaitMs: 8000, sleep: noSleep })).rejects.toMatchObject({ kind: "annule" });
    expect(b.calls).toBe(0);
  });

  it("aucun modèle configuré : erreur non_configure", async () => {
    await expect(generateWithFallback([], req(), { maxCalls: 4, maxWaitMs: 8000 })).rejects.toMatchObject({ kind: "non_configure" });
  });
});

describe("classification HTTP et Retry-After", () => {
  it("distingue les cas", () => {
    expect(classifyHttpError(401, "", null).kind).toBe("cle_invalide");
    expect(classifyHttpError(404, "", null).kind).toBe("modele_indisponible");
    expect(classifyHttpError(429, "Quota exceeded for GenerateRequestsPerDayPerProjectPerModel", null).kind).toBe("quota_journalier");
    expect(classifyHttpError(429, "rate limit", "7").retryAfterMs).toBe(7000);
    expect(classifyHttpError(503, "", null).kind).toBe("surcharge");
  });
  it("lit Retry-After en secondes ou en date HTTP", () => {
    expect(parseRetryAfter("3")).toBe(3000);
    const now = Date.parse("2026-10-13T10:00:00Z");
    expect(parseRetryAfter("Tue, 13 Oct 2026 10:00:05 GMT", now)).toBe(5000);
    expect(parseRetryAfter(null)).toBeUndefined();
  });
});

describe("fournisseur Gemini", () => {
  it("transmet la clé en en-tête, jamais dans l'URL, et lit la réponse", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).not.toContain("key=");
      expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe("CLE");
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{\"a\":1}" }] } }] }), { status: 200 });
    });
    const p = geminiProvider("CLE", "modele-test", fetchMock as unknown as typeof fetch, "https://exemple.test/v1beta");
    await expect(p.generate(req())).resolves.toBe('{"a":1}');
  });
  it("classe un 503 avec Retry-After", async () => {
    const fetchMock = vi.fn(async () => new Response("overloaded", { status: 503, headers: { "retry-after": "4" } }));
    const p = geminiProvider("CLE", "m", fetchMock as unknown as typeof fetch);
    await expect(p.generate(req())).rejects.toMatchObject({ kind: "surcharge", retryAfterMs: 4000 });
  });
});

describe("expurgation des erreurs", () => {
  it("masque clés et jetons", () => {
    const s = sanitizeError(new Error("GET https://x/?key=AIzaSyABCDEFGHIJKLMNOP failed Bearer sk-abcdefghijklmnop"));
    expect(s).not.toMatch(/AIza|sk-abc/);
  });
});
