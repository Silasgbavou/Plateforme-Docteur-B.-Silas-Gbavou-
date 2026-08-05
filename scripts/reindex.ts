/**
 * Réindexation complète du corpus pour l'assistant IA.
 *   npm run rag:reindex
 *
 * À exécuter après un import massif, un changement de moteur d'embeddings
 * (ajout d'une clé Voyage, par exemple) ou une modification du découpage.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Import dynamique : les modules RAG sont marqués « server-only ».
  const { indexContent } = await import('../src/lib/rag');
  const { embeddingModelName } = await import('../src/lib/embeddings');

  const contents = await prisma.content.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, title: true },
  });

  console.log(`Moteur d'embeddings : ${embeddingModelName()}`);
  console.log(`${contents.length} contenu(s) publié(s) à indexer.\n`);

  let total = 0;
  for (const [i, content] of contents.entries()) {
    const chunks = await indexContent(content.id);
    total += chunks;
    console.log(
      `[${String(i + 1).padStart(3)}/${contents.length}] ${chunks
        .toString()
        .padStart(3)} fragments — ${content.title}`,
    );
  }

  console.log(`\n✔ ${total} fragments indexés.`);
}

main()
  .catch((error) => {
    console.error('✗ Échec de l’indexation :', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
