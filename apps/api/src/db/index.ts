import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import { BASE_SPANISH_DICTIONARY } from './seed-data.js';
import { normalizeWord } from '@stop/shared';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:password123@localhost:5432/stop_db';

let sqlClient: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

// In-memory quick lookup Set: `category:normalizedWord`
export const inMemoryDictionary = new Set<string>();

// Pre-fill memory dictionary from seed data immediately
for (const group of BASE_SPANISH_DICTIONARY) {
  for (const word of group.words) {
    const norm = normalizeWord(word);
    inMemoryDictionary.add(`${group.category}:${norm}`);
  }
}

export function getDb() {
  if (!dbInstance) {
    try {
      sqlClient = postgres(connectionString, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 5,
        onnotice: () => {},
      });
      dbInstance = drizzle(sqlClient, { schema });
    } catch (err) {
      console.warn('⚠️ [DB] Warning: PostgreSQL not reachable, running with in-memory store:', (err as Error).message);
    }
  }
  return dbInstance;
}

export async function isWordInDictionary(category: string, rawWord: string): Promise<boolean> {
  const norm = normalizeWord(rawWord);
  if (!norm) return false;

  // 1. Fast in-memory check
  const memKey = `${category}:${norm}`;
  if (inMemoryDictionary.has(memKey)) {
    return true;
  }

  // 2. Database query if connected
  try {
    const db = getDb();
    if (db) {
      const results = await db.query.dictionary.findMany({
        where: (d, { eq, and }) => and(eq(d.category, category), eq(d.normalizedWord, norm)),
        limit: 1,
      });
      if (results && results.length > 0) {
        inMemoryDictionary.add(memKey);
        return true;
      }
    }
  } catch {
    // If DB fails, fallback to false
  }

  return false;
}

export async function registerWordInDictionary(category: string, rawWord: string): Promise<void> {
  const norm = normalizeWord(rawWord);
  if (!norm) return;
  inMemoryDictionary.add(`${category}:${norm}`);

  try {
    const db = getDb();
    if (db) {
      await db.insert(schema.dictionary).values({
        category,
        normalizedWord: norm,
        originalWord: rawWord.trim(),
        isApproved: true,
      }).onConflictDoNothing();
    }
  } catch {
    // Graceful fallback
  }
}

export { schema };
