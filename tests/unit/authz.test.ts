import { describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { conversationForReader, listMessages, postMinistryReply, postReaderMessage, decodeCursor } from "@/lib/server/messages";
import { listThread, deleteThreads } from "@/lib/server/study/engine";
import { downloadRequestSchema } from "@/lib/domain/download-schema";
import { recordDownloadRequest, readerOwnsDownload } from "@/lib/server/downloads";
import { seedCatalog } from "@/lib/server/catalog";
import { importEditionFile, publishEdition } from "@/lib/server/editions";
import { runOnce } from "@/lib/server/worker";
import { seal, unseal } from "@/lib/server/session";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { makePdf, TEST_PAGES } from "../fixtures/make-pdf";
import { ApiError } from "@/lib/server/http";

db().prepare("INSERT INTO readers (id) VALUES ('A'), ('B')").run();

describe("consultation privée : isolation par lecteur", () => {
  it("A ne voit jamais les messages de B", () => {
    postReaderMessage("A", { body: "message de A", clientId: "11111111-1111-4111-8111-111111111111", displayName: "Lecteur A" });
    postReaderMessage("B", { body: "message de B", clientId: "22222222-2222-4222-8222-222222222222", displayName: "Lecteur B" });
    const convA = conversationForReader("A")!;
    const msgs = listMessages(convA.id).messages.map((m) => m.body);
    expect(msgs).toEqual(["message de A"]);
  });
  it("un clientId rejoué par un autre lecteur est refusé ; rejoué par le même, idempotent", () => {
    expect(() => postReaderMessage("B", { body: "x", clientId: "11111111-1111-4111-8111-111111111111" })).toThrow(ApiError);
    const again = postReaderMessage("A", { body: "message de A", clientId: "11111111-1111-4111-8111-111111111111" });
    expect(again.body).toBe("message de A");
    expect(listMessages(conversationForReader("A")!.id).messages).toHaveLength(1);
  });
  it("pagination par curseur sans perte ni doublon", () => {
    const conv = conversationForReader("A")!;
    for (let i = 0; i < 45; i++) postMinistryReply(conv.id, `réponse ${i}`, `cid-${i}`);
    const p1 = listMessages(conv.id, 30);
    const p2 = listMessages(conv.id, 30, decodeCursor(p1.nextCursor));
    const all = [...p2.messages, ...p1.messages].map((m) => m.id);
    expect(new Set(all).size).toBe(46);
    expect(p2.nextCursor).toBeNull();
  });
  it("le premier message exige un nom", () => {
    db().prepare("INSERT INTO readers (id) VALUES ('C')").run();
    expect(() => postReaderMessage("C", { body: "x", clientId: "33333333-3333-4333-8333-333333333333" })).toThrow(/nom/);
  });
});

describe("historique d'étude : isolation et suppression", () => {
  it("chaque lecteur ne lit et ne supprime que son historique", () => {
    const ins = db().prepare("INSERT INTO etude_conversations (id, session_id, thread_id, question_utilisateur, statut, request_id) VALUES (?, ?, ?, ?, 'documentaire', 'r')");
    ins.run("e1", "A", "t", "question A");
    ins.run("e2", "B", "t", "question B");
    expect(listThread("A", "t").map((x) => x.question)).toEqual(["question A"]);
    expect(deleteThreads("A")).toBe(1);
    expect(listThread("B", "t")).toHaveLength(1);
  });
});

describe("demandes d'ouvrage", () => {
  const valid = {
    workId: "eglise-glorieuse", idempotencyKey: "44444444-4444-4444-8444-444444444444",
    lastName: " Doe ", firstName: "Jane", church: "Église de test", whatsapp: "+229 01 00 00 00 00",
    email: "", motivation: "Approfondir ma lecture.", discovery: "Facebook",
  };
  it("email facultatif, numéro normalisé, champs nettoyés", () => {
    const r = downloadRequestSchema.parse(valid);
    expect(r).toMatchObject({ lastName: "Doe", email: null, whatsapp: "+2290100000000" });
  });
  it("erreurs explicites", () => {
    const r = downloadRequestSchema.safeParse({ ...valid, whatsapp: "12", motivation: "court", discovery: "Inconnu", email: "pas-un-email" });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["whatsapp", "motivation", "discovery", "email"]));
  });
  it("enregistrement idempotent, lié à l'édition publiée et au lecteur", async () => {
    seedCatalog();
    const parsed = downloadRequestSchema.parse(valid);
    expect(() => recordDownloadRequest("A", parsed)).toThrow(/pas encore disponible/); // pas d'édition publiée
    const imp = await importEditionFile({ workId: "eglise-glorieuse", label: "t", data: makePdf(TEST_PAGES), sourceKind: "depot" });
    await runOnce("w", new AbortController().signal);
    publishEdition(imp.editionId, "t");
    const first = recordDownloadRequest("A", parsed);
    const second = recordDownloadRequest("A", parsed);
    expect(second).toMatchObject({ id: first.id, replay: true, editionId: imp.editionId });
    expect((db().prepare("SELECT COUNT(*) AS n FROM download_requests").get() as { n: number }).n).toBe(1);
    expect(() => recordDownloadRequest("B", parsed)).toThrow(ApiError);
    expect(readerOwnsDownload("A", first.id, imp.editionId)).toBe(true);
    expect(readerOwnsDownload("B", first.id, imp.editionId)).toBe(false);
  });
});

describe("cookies signés et mots de passe", () => {
  it("refuse un cookie falsifié ou expiré", () => {
    const token = seal({ rid: "A" });
    expect(unseal<{ rid: string }>(token)?.rid).toBe("A");
    const [body] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ rid: "B" })).toString("base64url")}.${token.split(".")[1]}`;
    expect(unseal(forged)).toBeNull();
    expect(unseal(`${body}.AAAA`)).toBeNull();
    expect(unseal(seal({ email: "x", exp: 1 }))).toBeNull();
  });
  it("scrypt : vérifie le bon mot de passe uniquement", () => {
    const h = hashPassword("un mot de passe solide");
    expect(verifyPassword("un mot de passe solide", h)).toBe(true);
    expect(verifyPassword("autre", h)).toBe(false);
    expect(verifyPassword("x", undefined)).toBe(false);
  });
});
