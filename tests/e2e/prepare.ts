/**
 * Préparation de l'environnement E2E (exécutée avant le serveur) :
 * base neuve, catalogue initial, édition de TEST (PDF neutre généré) importée en brouillon puis extraite par le worker.
 * La publication est faite par le test via le bureau, comme le ferait l'administrateur.
 */
import { rmSync, mkdirSync } from "node:fs";
import { seedCatalog } from "@/lib/server/catalog";
import { importEditionFile } from "@/lib/server/editions";
import { runOnce } from "@/lib/server/worker";
import { makePdf, TEST_PAGES } from "../fixtures/make-pdf";

const dir = process.env.E2E_DIR!;
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
seedCatalog();
const r = await importEditionFile({ workId: "sept-montagnes", label: "Édition de test E2E", data: makePdf(TEST_PAGES), sourceKind: "depot" });
const signal = new AbortController().signal;
while (await runOnce("e2e-prepare", signal)) { /* vide la file */ }
console.log(`[e2e] édition brouillon ${r.editionId} prête`);
