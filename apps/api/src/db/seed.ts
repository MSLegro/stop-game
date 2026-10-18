import { getDb, schema } from './index.js';
import { BASE_SPANISH_DICTIONARY } from './seed-data.js';
import { normalizeWord } from '@stop/shared';

async function seed() {
  console.log('🌱 [Seed] Starting dictionary population...');
  const db = getDb();
  if (!db) {
    console.error('❌ [Seed] Could not connect to PostgreSQL. Is the database running?');
    process.exit(1);
  }

  let totalInserted = 0;
  for (const group of BASE_SPANISH_DICTIONARY) {
    for (const word of group.words) {
      const norm = normalizeWord(word);
      try {
        await db.insert(schema.dictionary).values({
          category: group.category,
          normalizedWord: norm,
          originalWord: word,
          isApproved: true,
        }).onConflictDoNothing();
        totalInserted++;
      } catch (err) {
        console.warn(`Could not insert word ${word}:`, (err as Error).message);
      }
    }
  }

  console.log(`✅ [Seed] Successfully seeded ${totalInserted} words into PostgreSQL!`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ [Seed] Unhandled error during seed:', err);
  process.exit(1);
});
