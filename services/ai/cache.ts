import { db, ensureDatabaseInitialized } from "@/services/db/client";
import { aiCacheTable } from "@/services/db/schema";
import { and, eq } from "drizzle-orm";

const MIN_TTL_MS = 1_000;
const MAX_TTL_MS = 30 * 24 * 60 * 60 * 1_000;

const toCacheKey = (cacheType: string, key: string): string => {
  return `${cacheType}:${key}`;
};

const clampTtlMs = (ttlMs: number): number => {
  if (!Number.isFinite(ttlMs)) {
    return MIN_TTL_MS;
  }

  return Math.max(MIN_TTL_MS, Math.min(MAX_TTL_MS, Math.floor(ttlMs)));
};

export interface AiCacheEntry<T> {
  key: string;
  type: string;
  value: T;
  expiresAtMs: number;
  createdAtMs: number;
  hitCount: number;
}

export const getAiCacheValue = async <T>(
  cacheType: string,
  key: string,
): Promise<T | null> => {
  const cacheKey = toCacheKey(cacheType, key);

  try {
    await ensureDatabaseInitialized();

    const rows = await db
      .select()
      .from(aiCacheTable)
      .where(
        and(
          eq(aiCacheTable.cacheType, cacheType),
          eq(aiCacheTable.cacheKey, cacheKey),
        ),
      );

    const row = rows[0];
    if (!row) {
      return null;
    }

    const now = Date.now();
    if (row.expiresAtMs <= now) {
      await db.delete(aiCacheTable).where(eq(aiCacheTable.cacheKey, cacheKey));
      return null;
    }

    await db
      .update(aiCacheTable)
      .set({ hitCount: row.hitCount + 1 })
      .where(eq(aiCacheTable.cacheKey, cacheKey));

    return JSON.parse(row.valueJson) as T;
  } catch (error) {
    console.error("Error loading AI cache value:", error);
    return null;
  }
};

export const setAiCacheValue = async <T>(
  cacheType: string,
  key: string,
  value: T,
  ttlMs: number,
): Promise<void> => {
  const now = Date.now();
  const clampedTtlMs = clampTtlMs(ttlMs);
  const cacheKey = toCacheKey(cacheType, key);

  try {
    await ensureDatabaseInitialized();

    await db.delete(aiCacheTable).where(eq(aiCacheTable.cacheKey, cacheKey));

    await db.insert(aiCacheTable).values({
      cacheKey,
      cacheType,
      valueJson: JSON.stringify(value),
      expiresAtMs: now + clampedTtlMs,
      createdAtMs: now,
      hitCount: 0,
    });
  } catch (error) {
    console.error("Error saving AI cache value:", error);
  }
};
