import { describe, expect, it } from "vitest";

process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "mot-de-passe-du-coffre";
process.env.RENDER_EXTERNAL_URL = "https://ministere.onrender.com";

const { verifyAdminPassword, adminConfigured } = await import("@/lib/server/admin");
const { env } = await import("@/lib/server/env");

describe("configuration simplifiée pour l'hébergeur", () => {
  it("accepte le mot de passe du coffre, refuse les autres", () => {
    expect(adminConfigured()).toBe(true);
    expect(verifyAdminPassword("mot-de-passe-du-coffre")).toBe(true);
    expect(verifyAdminPassword("mot-de-passe-du-coffrE")).toBe(false);
    expect(verifyAdminPassword("")).toBe(false);
  });
  it("utilise l'URL publique de l'hébergeur et reste en mode documentaire sans clé", () => {
    expect(env().SITE_URL).toBe("https://ministere.onrender.com");
    expect(env().LLM_PROVIDER).toBe("none");
  });
});
