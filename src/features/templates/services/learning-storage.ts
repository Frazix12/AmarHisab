import { db, ensureDatabaseInitialized } from "@/services/db/client";
import { learningTelemetryTable } from "@/services/db/schema";
import { LearningTelemetry } from "@/types/template";
import { eq } from "drizzle-orm";

const parseJson = <T>(input: string, fallback: T): T => {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
};

const toRow = (data: LearningTelemetry): typeof learningTelemetryTable.$inferInsert => ({
  productNameNormalized: data.productNameNormalized,
  userId: data.userId,
  totalSeenCount: data.totalSeenCount,
  lastSeenAtMs: data.lastSeenAt.getTime(),
  lastSuggestedAtMs: data.lastSuggestedAt ? data.lastSuggestedAt.getTime() : null,
  dismissedForever: data.dismissedForever,
  categoryFrequencyJson: JSON.stringify(data.categoryFrequency || {}),
  priceHistoryJson: JSON.stringify(data.priceHistory || []),
  quantityHistoryJson: JSON.stringify(data.quantityHistory || []),
});

const toModel = (row: typeof learningTelemetryTable.$inferSelect): LearningTelemetry => ({
  userId: row.userId,
  productNameNormalized: row.productNameNormalized,
  totalSeenCount: row.totalSeenCount,
  lastSeenAt: new Date(row.lastSeenAtMs),
  lastSuggestedAt: row.lastSuggestedAtMs ? new Date(row.lastSuggestedAtMs) : null,
  dismissedForever: !!row.dismissedForever,
  categoryFrequency: parseJson(row.categoryFrequencyJson, {} as any),
  priceHistory: parseJson(row.priceHistoryJson, []),
  quantityHistory: parseJson(row.quantityHistoryJson, []),
});

/**
 * Storage operations for learning telemetry
 * Tracks historical patterns to suggest templates
 */
export const LearningStorage = {
  /**
   * Get all learning telemetry data
   */
  async getAll(): Promise<Record<string, LearningTelemetry>> {
    try {
      await ensureDatabaseInitialized();
      const rows = await db.select().from(learningTelemetryTable);

      return rows.reduce<Record<string, LearningTelemetry>>(
        (
          acc: Record<string, LearningTelemetry>,
          row: typeof learningTelemetryTable.$inferSelect,
        ) => {
        const telemetry = toModel(row);
        acc[telemetry.productNameNormalized] = telemetry;
        return acc;
        },
        {},
      );
    } catch (error) {
      console.error("Error loading learning telemetry:", error);
      return {};
    }
  },

  /**
   * Get telemetry for specific normalized product name
   */
  async getTelemetry(
    normalizedName: string,
  ): Promise<LearningTelemetry | null> {
    try {
      await ensureDatabaseInitialized();
      const rows = await db
        .select()
        .from(learningTelemetryTable)
        .where(eq(learningTelemetryTable.productNameNormalized, normalizedName));
      return rows.length > 0 ? toModel(rows[0]) : null;
    } catch (error) {
      console.error("Error loading learning telemetry by key:", error);
      return null;
    }
  },

  /**
   * Update or create telemetry record
   */
  async updateTelemetry(data: LearningTelemetry): Promise<void> {
    try {
      await ensureDatabaseInitialized();
      await db.transaction(async (tx) => {
        await tx
          .delete(learningTelemetryTable)
          .where(eq(learningTelemetryTable.productNameNormalized, data.productNameNormalized));
        await tx.insert(learningTelemetryTable).values(toRow(data));
      });
    } catch (error) {
      console.error("Error updating learning telemetry:", error);
    }
  },

  /**
   * Mark product as dismissed forever (user chose "Never for this item")
   */
  async markDismissedForever(normalizedName: string): Promise<void> {
    try {
      const telemetry = await this.getTelemetry(normalizedName);

      if (telemetry) {
        telemetry.dismissedForever = true;
        await this.updateTelemetry(telemetry);
      } else {
        await this.updateTelemetry({
          userId: "default",
          productNameNormalized: normalizedName,
          totalSeenCount: 0,
          lastSeenAt: new Date(),
          lastSuggestedAt: null,
          dismissedForever: true,
          categoryFrequency: {} as any,
          priceHistory: [],
          quantityHistory: [],
        });
      }
    } catch (error) {
      console.error("Error marking learning telemetry dismissed forever:", error);
    }
  },

  /**
   * Record that suggestion was shown
   */
  async recordSuggestion(normalizedName: string): Promise<void> {
    try {
      const telemetry = await this.getTelemetry(normalizedName);

      if (telemetry) {
        telemetry.lastSuggestedAt = new Date();
        await this.updateTelemetry(telemetry);
      }
    } catch (error) {
      console.error("Error recording learning suggestion:", error);
    }
  },

  /**
   * Clean up old telemetry data (>90 days)
   */
  async cleanup(): Promise<void> {
    const all = await this.getAll();
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

    await Promise.all(
      Object.entries(all).map(async ([key, value]) => {
        if (value.lastSeenAt.getTime() <= ninetyDaysAgo && !value.dismissedForever) {
          await db
            .delete(learningTelemetryTable)
            .where(eq(learningTelemetryTable.productNameNormalized, key));
        }
      }),
    );
  },

  /**
   * Clear all learning data (for testing or reset)
   */
  async clear(): Promise<void> {
    await ensureDatabaseInitialized();
    await db.delete(learningTelemetryTable);
  },
};
