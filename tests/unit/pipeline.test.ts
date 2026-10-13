import { describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { seedCatalog, getPublishedEdition, listPublishedWorks, getPageText } from "@/lib/server/catalog";
import { importEditionFile, publishEdition, PublishError } from "@/lib/server/editions";
import { runOnce } from "@/lib/server/worker";
import { lexicalSearch } from "@/lib/server/study/retrieval";
import { runStudy } from "@/lib/server/study/engine";
import { makePdf, TEST_PAGES } from "../fixtures/make-pdf";
import type { StudyEvent } from "@/lib/domain/study-types";
import { PILLARS } from "@/lib/domain/pillars";
import { WORK_SEEDS } from "@/lib/domain/catalog-seed";

describe("catalogue initial", () => {
  it("trois piliers aux libellés exacts", () => {
    expect(PILLARS.map((p) => p.label)).toEqual(["Enseignements Prophétiques", "Enseignements Spirituels", "Enseignements Doctrinaux"]);
  });
  it("huit œuvres publiées classées, deux à classer sans pilier inventé", () => {
    seedCatalog();
    const published = listPublishedWorks();
    expect(published).toHaveLength(8);
    expect(Object.fromEntries(published.map((w) => [w.id, w.pillar]))).toEqual({
      "introduction-mouvement-prophetique": "prophetique",
      "ruach-naba": "prophetique",
      "la-priere-qui-engendre": "spirituel",
      "eglise-glorieuse": "doctrinal",
      "fondements-legaux-priere": "doctrinal",
      "royaume-puissance": "spirituel",
      "realites-redemption": "doctrinal",
      "sept-montagnes": "spirituel",
    });
    const pending = WORK_SEEDS.filter((w) => w.status === "a_classer");
    expect(pending.map((w) => w.pillar)).toEqual([null, null]);
    seedCatalog(); // idempotent
    expect((db().prepare("SELECT COUNT(*) AS n FROM works").get() as { n: number }).n).toBe(10);
  });
  it("une œuvre ne peut être publiée sans pilier (contrainte en base)", () => {
    expect(() => db().prepare("UPDATE works SET status = 'publie' WHERE id = 'partenaires-de-dieu'").run()).toThrow();
  });
});

describe("édition immuable → extraction serveur → publication → recherche", () => {
  it("bout en bout", async () => {
    seedCatalog();
    const pdf = makePdf(TEST_PAGES);
    const r = await importEditionFile({ workId: "sept-montagnes", label: "Édition de test", data: pdf, sourceKind: "depot" });
    expect(r.duplicate).toBe(false);
    // Doublon binaire : aucune nouvelle édition
    const again = await importEditionFile({ workId: "sept-montagnes", label: "x", data: pdf, sourceKind: "depot" });
    expect(again).toMatchObject({ duplicate: true, editionId: r.editionId });
    // Le même fichier ne peut pas être rattaché à une autre œuvre
    await expect(importEditionFile({ workId: "ruach-naba", label: "x", data: pdf, sourceKind: "depot" })).rejects.toThrow(/autre œuvre/);
    // Fichier non PDF refusé
    await expect(importEditionFile({ workId: "ruach-naba", label: "x", data: new TextEncoder().encode("<html>"), sourceKind: "depot" })).rejects.toThrow(/PDF/);

    // Publication refusée avant extraction
    expect(() => publishEdition(r.editionId, "test")).toThrow(PublishError);

    // Le worker (processus indépendant du navigateur) exécute l'extraction
    expect(await runOnce("test-worker", new AbortController().signal)).toBe(true);
    const ed = db().prepare("SELECT page_count AS pages, pages_without_text AS empty, extraction_status AS st FROM editions WHERE id = ?").get(r.editionId) as { pages: number; empty: number; st: string };
    expect(ed).toEqual({ pages: 4, empty: 1, st: "partielle" });
    expect(getPageText(r.editionId, 2)).toContain("La patience du jardinier");

    // Brouillon : invisible de la recherche publique
    expect(lexicalSearch("patience jardinier", { context: "textes" })).toHaveLength(0);

    publishEdition(r.editionId, "test");
    expect(getPublishedEdition("sept-montagnes")?.id).toBe(r.editionId);
    const hits = lexicalSearch("patience du jardinier", { context: "textes" });
    expect(hits[0]).toMatchObject({ workId: "sept-montagnes", pageStart: 2, editionId: r.editionId });
    // Filtre par ouvrage appliqué AVANT la sélection
    expect(lexicalSearch("patience jardinier", { context: "textes", workId: "ruach-naba" })).toHaveLength(0);
    // Recherche insensible aux accents
    expect(lexicalSearch("étoiles marins", { context: "textes" })[0]?.pageStart).toBe(4);
  });

  it("une nouvelle édition remplace l'ancienne sans effacer ses pages (citations anciennes)", async () => {
    const old = getPublishedEdition("sept-montagnes")!;
    const pdf2 = makePdf([["Nouvelle edition de test avec un texte revu sur la patience du jardinier."]]);
    const r = await importEditionFile({ workId: "sept-montagnes", label: "Édition 2", data: pdf2, sourceKind: "depot" });
    await runOnce("w", new AbortController().signal);
    publishEdition(r.editionId, "test");
    const oldRow = db().prepare("SELECT status FROM editions WHERE id = ?").get(old.id) as { status: string };
    expect(oldRow.status).toBe("remplacee");
    expect(getPageText(old.id, 2)).toContain("jardinier");
    // La recherche ne porte que sur l'édition publiée
    const hits = lexicalSearch("jardinier", { context: "textes" });
    expect(hits.every((h) => h.editionId === r.editionId)).toBe(true);
  });

  it("moteur d'étude en mode documentaire (aucun fournisseur configuré)", async () => {
    db().prepare("INSERT OR IGNORE INTO readers (id) VALUES ('lecteur-a')").run();
    const events: StudyEvent[] = [];
    await runStudy({
      question: "Que disent les sources sur la patience du jardinier ?",
      threadId: "00000000-0000-4000-8000-000000000001",
      readerId: "lecteur-a",
      context: "textes",
      workId: null,
      requestId: "r1",
      signal: new AbortController().signal,
      emit: (e) => events.push(e),
    });
    expect(events.map((e) => e.event)).toEqual(["status", "sources", "answer", "done"]);
    const answer = events.find((e) => e.event === "answer")!;
    expect(answer.event === "answer" && answer.data.answer.kind).toBe("documentaire");
    const sources = events.find((e) => e.event === "sources")!;
    expect(sources.event === "sources" && sources.data.sources[0]!.href).toMatch(/^\/lecture\/sept-montagnes\?page=1&edition=/);
    const row = db().prepare("SELECT statut, session_id FROM etude_conversations").get() as { statut: string; session_id: string };
    expect(row).toEqual({ statut: "documentaire", session_id: "lecteur-a" });
  });

  it("question hors corpus : insuffisant, aucune réponse inventée", async () => {
    const events: StudyEvent[] = [];
    await runStudy({
      question: "Quelle est la recette du pain d'épices ?",
      threadId: "00000000-0000-4000-8000-000000000002",
      readerId: "lecteur-a", context: "textes", workId: null, requestId: "r2",
      signal: new AbortController().signal, emit: (e) => events.push(e),
    });
    const a = events.find((e) => e.event === "answer");
    expect(a?.event === "answer" && a.data.answer.kind).toBe("insuffisant");
  });
});
