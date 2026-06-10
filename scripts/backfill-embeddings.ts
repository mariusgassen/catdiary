/**
 * One-shot script: generate CLIP embeddings for all CatEntry rows that
 * currently have embedding = NULL.
 *
 * Run inside the container (after `prisma migrate deploy`):
 *   npm run backfill-embeddings
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { getObject } from "@/lib/storage";
import { getImageEmbedding } from "@/lib/embeddings";
import { storeCatEntryEmbedding } from "@/lib/catEntries";

async function main() {
  // Embed the cover photo (lowest position) of each entry missing an embedding.
  const entries = await db.$queryRaw<Array<{ id: string; photoKey: string }>>`
    SELECT DISTINCT ON (ce.id) ce.id, p."photoKey"
    FROM "CatEntry" ce
    JOIN "CatEntryPhoto" p ON p."catEntryId" = ce.id
    WHERE ce.embedding IS NULL
    ORDER BY ce.id, p.position ASC
  `;

  console.log(`Found ${entries.length} entries without embeddings.`);
  if (entries.length === 0) return;

  let done = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      const obj = await getObject(entry.photoKey);
      const buffer = Buffer.from(await obj.Body!.transformToByteArray());
      const embedding = await getImageEmbedding(buffer);
      await storeCatEntryEmbedding(entry.id, embedding);
      done++;
      console.log(`[${done}/${entries.length}] embedded ${entry.id}`);
    } catch (err) {
      failed++;
      console.error(`  failed ${entry.id}:`, err);
    }
  }

  console.log(`Done. ${done} succeeded, ${failed} failed.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
