import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ADMIN } from "../../playwright.config";

const FOOTER = "© 2026 Ministère d'Enseignement Docteur B. Silas Gbavou — Tous droits réservés. Ouvrage numérique réalisé selon les standards de la haute ingénierie logicielle et typographique.";

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "débordement horizontal").toBeLessThanOrEqual(0);
}

async function adminLogin(page: Page) {
  await page.goto("/gestion/connexion");
  await page.getByLabel("Adresse email").fill(ADMIN.email);
  await page.getByLabel("Mot de passe").fill(ADMIN.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
}

test.describe.serial("parcours principaux", () => {
  test("accueil : identité, trois piliers exacts, contacts, pied de page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText("Silas Gbavou");
    for (const label of ["Enseignements Prophétiques", "Enseignements Spirituels", "Enseignements Doctrinaux"]) {
      await expect(page.locator(".cartouche__title", { hasText: label })).toHaveCount(1);
    }
    await expect(page.locator(".site-footer__legal")).toHaveText(FOOTER);
    const fb = page.locator(`#contact a[href="https://www.facebook.com/share/1K1YwTnvhu/"]`);
    await expect(fb).toContainText("Docteur B. Silas Gbavou");
    await expect(page.locator(`#contact a[href="https://wa.me/2290167960094"]`)).toContainText("+229 01 67 96 00 94");
    await expect(page.locator(`#contact a[href="mailto:Silasgbavou@gmail.com"]`)).toBeVisible();
    // Aucune URL brute affichée à la place des noms
    await expect(page.getByText("https://", { exact: false })).toHaveCount(0);
    // Aucune mention publicitaire de générateur
    await expect(page.locator("body")).not.toContainText(/ChatGPT|OpenAI|no-code/i);
    // Noindex tant que l'audience est privée
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("bureau : accès refusé sans session, identifiants faux refusés", async ({ page, request }) => {
    await page.goto("/gestion");
    await expect(page).toHaveURL(/\/gestion\/connexion/);
    await page.getByLabel("Adresse email").fill(ADMIN.email);
    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.locator(".notice--error")).toContainText("Identifiants incorrects");
    expect((await request.get("/api/gestion/telechargements-csv")).status()).toBe(401);
  });

  test("bureau : publication de l'édition de test", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/gestion/catalogue");
    const panel = page.locator("section.admin__panel", { has: page.getByRole("heading", { name: "Les Sept Montagnes d'une ville" }) });
    await expect(panel.getByRole("cell", { name: /partielle/ })).toBeVisible();
    await panel.getByRole("button", { name: "Publier" }).click();
    await expect(page.locator(".notice--ok")).toContainText("Édition publiée");
  });

  test("bibliothèque : filtres par pilier et thème, état vide", async ({ page }) => {
    await page.goto("/bibliotheque");
    await expect(page.locator(".library-card")).toHaveCount(8);
    await page.getByRole("link", { name: "Enseignements Spirituels" }).first().click();
    await expect(page).toHaveURL(/pilier=spirituel/);
    await expect(page.locator(".library-card")).toHaveCount(3);
    await expect(page.getByRole("status")).toContainText("3 ouvrages — Enseignements Spirituels");
    await page.goto("/bibliotheque?pilier=prophetique&theme=Pri%C3%A8re");
    await expect(page.getByText("Aucun ouvrage ne correspond à ce filtre.")).toBeVisible();
  });

  test("liseuse : page exacte, filigrane, texte extrait", async ({ page }) => {
    await page.goto("/lecture/sept-montagnes?page=2");
    await expect(page.locator(".reader__page[data-ready='true'] canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#reader-page")).toHaveValue("2");
    await expect(page.locator(".reader__watermark")).toHaveText("Tous droits réservés - Ministère Dr B. Silas Gbavou");
    await page.getByRole("button", { name: "Texte" }).click();
    await expect(page.locator(".reader__text-body")).toContainText("La patience du jardinier");
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/page=3/);
    await page.getByRole("button", { name: "Texte" }).click();
    await page.getByRole("button", { name: "Texte" }).click();
    await expect(page.locator(".reader__text")).toContainText("pas de couche texte");
  });

  test("recevoir un ouvrage : validation, double clic, téléchargement réservé au demandeur", async ({ page, browser }) => {
    await page.goto("/ouvrages/sept-montagnes");
    const submit = page.getByRole("button", { name: "Enregistrer et obtenir le livre" });
    await expect(submit).toBeDisabled();
    await page.getByLabel("Nom", { exact: false }).first().fill("Testeur");
    await page.getByLabel("Prénom").fill("Paul");
    await page.getByLabel("Église locale").fill("Assemblée de test");
    await page.getByLabel("Numéro WhatsApp").fill("12");
    await page.getByLabel("Numéro WhatsApp").blur();
    await expect(page.locator(".field__error").first()).toContainText("Numéro WhatsApp invalide");
    await page.getByLabel("Numéro WhatsApp").fill("+229 01 00 00 00 01");
    await page.getByLabel("Motivation").fill("Approfondir ma compréhension du texte.");
    await page.getByLabel("Comment avez-vous connu le ministère ?").selectOption("Facebook");
    await expect(submit).toBeEnabled();
    // Double clic : une seule demande enregistrée
    await submit.dblclick();
    await expect(page.getByText("Votre demande est enregistrée.")).toBeVisible();
    const href = await page.getByRole("link", { name: "Télécharger le PDF" }).getAttribute("href");
    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect(res.headers()["content-disposition"]).toContain("attachment");
    // Un autre navigateur (autre lecteur) ne peut pas réutiliser le lien
    const other = await browser.newContext();
    expect((await other.request.get(`http://localhost:3100${href}`)).status()).toBe(403);
    await other.close();
    // Rechargement : le lien reste disponible (reprise)
    await page.reload();
    await expect(page.getByText("Votre demande est enregistrée.")).toBeVisible();
    // Le bureau voit exactement une fiche
    await adminLogin(page);
    await page.goto("/gestion/telechargements");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr")).toContainText("Assemblée de test");
  });

  test("API : mutation sans origine refusée (CSRF), validation serveur", async ({ request }) => {
    const r1 = await request.post("/api/download", { data: {}, headers: { origin: "https://malveillant.example" } });
    expect(r1.status()).toBe(403);
    const r2 = await request.post("/api/download", { data: { workId: "sept-montagnes" }, headers: { origin: "http://localhost:3100" } });
    expect(r2.status()).toBe(422);
    const body = await r2.json();
    expect(body.error.fields).toHaveProperty("lastName");
    expect(body).toHaveProperty("requestId");
  });

  test("étude : synthèse sourcée vérifiée, citation inventée écartée, historique durable", async ({ page }) => {
    await page.goto("/etude?ouvrage=sept-montagnes");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Moteur d'Étude & Concordance Doctrinale du Dr B. Silas");
    await expect(page.locator(".badge").first()).toContainText("Recherche et synthèse sourcée");
    await page.getByLabel("Votre question").fill("Que dit le texte sur la patience du jardinier ?");
    await page.getByRole("button", { name: "Envoyer" }).click();
    const exchange = page.locator(".exchange").last();
    await expect(exchange.getByRole("heading", { name: "1. Fondement Théologique" })).toBeVisible({ timeout: 20_000 });
    await expect(exchange.locator(".citation")).toHaveCount(1);
    await expect(exchange).not.toContainText("phrase totalement inventée");
    const sourceLink = exchange.locator(".source__title").first();
    await expect(sourceLink).toHaveAttribute("href", /\/lecture\/sept-montagnes\?page=2&edition=/);
    await expect(exchange.locator(".followup")).toHaveCount(1);
    // Rechargement : l'historique du fil est restauré depuis le serveur
    await page.reload();
    await expect(page.locator(".exchange__question").first()).toHaveText("Que dit le texte sur la patience du jardinier ?");
    // Isolation : un autre lecteur ne voit rien
    const other = await page.context().browser()!.newContext();
    const res = await other.request.get("http://localhost:3100/api/etude/historique");
    expect((await res.json()).data.threads).toEqual([]);
    await other.close();
    // Effacement par le lecteur
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Historique" }).click();
    await page.getByRole("button", { name: "Effacer tout mon historique" }).click();
    await expect(page.getByText("Votre historique d'étude a été effacé.")).toBeVisible();
  });

  test("étude : question hors corpus → limite exprimée et orientation", async ({ page }) => {
    await page.goto("/etude");
    await page.getByLabel("Votre question").fill("Quelle est la recette du pain d'épices ?");
    await page.keyboard.press("Enter");
    await expect(page.locator(".answer__notice")).toContainText("Aucun passage du corpus publié", { timeout: 15_000 });
    await expect(page.getByRole("link", { name: "écrire au ministère en consultation privée" })).toBeVisible();
  });

  test("consultation privée : envoi, isolation, réponse du ministère", async ({ page, browser }) => {
    await page.goto("/discussion");
    await page.getByLabel("Votre nom").fill("Lecteur Test");
    await page.getByLabel("Votre message").fill("Bonjour, une question personnelle de test.");
    await page.getByRole("button", { name: "Envoyer au ministère" }).click();
    await expect(page.locator(".chat__msg--lecteur")).toContainText("une question personnelle de test");
    const other = await browser.newContext();
    const r = await other.request.get("http://localhost:3100/api/messages");
    expect((await r.json()).data.messages).toEqual([]);
    await other.close();
    const admin = await browser.newContext();
    const ap = await admin.newPage();
    await adminLogin(ap);
    await ap.goto("/gestion/messages");
    await ap.getByRole("link", { name: /Lecteur Test/ }).click();
    await ap.getByLabel("Réponse du ministère").fill("Merci pour votre message de test.");
    await ap.getByRole("button", { name: "Envoyer la réponse" }).click();
    await expect(ap.locator(".chat__body", { hasText: "Merci pour votre message de test." })).toBeVisible();
    await admin.close();
    await page.reload();
    await expect(page.locator(".chat__msg--ministere")).toContainText("Merci pour votre message de test.");
  });

  test("Observatoire : l'échange d'étude est consultable avec sa réponse intégrale", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/gestion/observatoire?q=pain");
    await expect(page.locator(".observatory > li")).toHaveCount(1);
    await expect(page.locator(".observatory")).toContainText("insuffisant");
  });
});

test.describe("responsive et accessibilité", () => {
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    test(`aucun débordement horizontal à ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/bibliotheque", "/ouvrages/sept-montagnes", "/etude", "/discussion", "/enseignements/spirituel"]) {
        await page.goto(path);
        await noHorizontalOverflow(page);
      }
    });
  }

  test("menu mobile : ouverture, Escape, retour du focus", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Menu" });
    await toggle.click();
    await expect(page.getByRole("navigation", { name: "Navigation mobile" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigation mobile" }).getByRole("link").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Navigation mobile" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
  });

  test("étude mobile : zone de saisie visible et première question lisible", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/etude");
    await expect(page.getByLabel("Votre question")).toBeVisible();
    const box = await page.getByLabel("Votre question").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(640);
  });

  for (const path of ["/", "/bibliotheque", "/ouvrages/sept-montagnes", "/etude", "/discussion", "/confidentialite", "/lecture/sept-montagnes?page=1", "/gestion/connexion"]) {
    test(`axe (WCAG 2.2 A/AA) : ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
    });
  }
});

test.describe("PWA", () => {
  test("première visite : l'installation du service worker ne recharge pas la page (saisie conservée)", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/discussion", { waitUntil: "commit" });
    await page.getByLabel("Votre message").fill("Brouillon tapé dès le chargement");
    await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === "activated", null, { timeout: 15_000 });
    await page.waitForTimeout(1000);
    await expect(page.getByLabel("Votre message")).toHaveValue("Brouillon tapé dès le chargement");
    await ctx.close();
  });

  test("manifest installable et service worker au périmètre public", async ({ page, context }) => {
    const res = await page.request.get("/manifest.webmanifest");
    const m = await res.json();
    expect(m).toMatchObject({ id: "/", start_url: "/?source=pwa", scope: "/", display: "standalone" });
    expect(m.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`)).toEqual(["192x192:any", "512x512:any", "512x512:maskable"]);
    for (const i of m.icons) expect((await page.request.get(i.src)).status()).toBe(200);

    await page.goto("/");
    await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === "activated", null, { timeout: 15_000 });
    await page.reload();
    await page.goto("/bibliotheque");
    await page.goto("/discussion");
    await page.waitForTimeout(500);
    const cached = await page.evaluate(async () => {
      const out: string[] = [];
      for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname);
      return out;
    });
    expect(cached).toContain("/hors-ligne");
    expect(cached).toContain("/bibliotheque");
    expect(cached.filter((p) => p.startsWith("/api/") || p.startsWith("/gestion") || p.startsWith("/discussion"))).toEqual([]);

    // Coupure réseau simulée y compris pour le service worker (PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS).
    await context.route("**/*", (route) => route.abort("internetdisconnected"));
    await page.goto("/bibliotheque");
    await expect(page.locator("h1")).toContainText("Les ouvrages");
    await page.goto("/ecrits");
    await expect(page.locator("h1")).toContainText("Vous n'êtes pas connecté");
    await context.unrouteAll();
  });
});
