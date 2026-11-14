import { ok } from "@/lib/server/http";
import { corpusCounts } from "@/lib/server/study/retrieval";
import { generationStatus } from "@/lib/server/llm/registry";
import { embeddingConfigured } from "@/lib/server/embeddings";

/** État RÉEL affiché au lecteur (aucun « connecté » sans vérification de configuration). */
export async function GET() {
  const counts = corpusCounts();
  const gen = generationStatus();
  return ok(
    { corpus: counts, synthese: gen.configured, semantique: embeddingConfigured() },
    { headers: { "cache-control": "no-store" } },
  );
}
