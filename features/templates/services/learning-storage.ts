import { LearningTelemetry } from "@/types/template";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LEARNING_KEY = "@amarhisab:learning";

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
      const data = await AsyncStorage.getItem(LEARNING_KEY);
      if (!data) return {};

      const telemetry = JSON.parse(data);

      // Convert date strings back to Date objects
      Object.keys(telemetry).forEach((key) => {
        telemetry[key].lastSeenAt = new Date(telemetry[key].lastSeenAt);
        if (telemetry[key].lastSuggestedAt) {
          telemetry[key].lastSuggestedAt = new Date(
            telemetry[key].lastSuggestedAt,
          );
        }
      });

      return telemetry;
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
    const all = await this.getAll();
    return all[normalizedName] || null;
  },

  /**
   * Update or create telemetry record
   */
  async updateTelemetry(data: LearningTelemetry): Promise<void> {
    const all = await this.getAll();
    all[data.productNameNormalized] = data;
    await AsyncStorage.setItem(LEARNING_KEY, JSON.stringify(all));
  },

  /**
   * Mark product as dismissed forever (user chose "Never for this item")
   */
  async markDismissedForever(normalizedName: string): Promise<void> {
    const telemetry = await this.getTelemetry(normalizedName);

    if (telemetry) {
      telemetry.dismissedForever = true;
      await this.updateTelemetry(telemetry);
    } else {
      // Create new entry marked as dismissed
      await this.updateTelemetry({
        userId: "default", // Will be updated when multi-user support added
        productNameNormalized: normalizedName,
        seenCount30d: 0,
        lastSeenAt: new Date(),
        lastSuggestedAt: null,
        dismissedForever: true,
        categoryFrequency: {} as any,
        priceHistory: [],
        quantityHistory: [],
      });
    }
  },

  /**
   * Record that suggestion was shown
   */
  async recordSuggestion(normalizedName: string): Promise<void> {
    const telemetry = await this.getTelemetry(normalizedName);

    if (telemetry) {
      telemetry.lastSuggestedAt = new Date();
      await this.updateTelemetry(telemetry);
    }
  },

  /**
   * Clean up old telemetry data (>90 days)
   */
  async cleanup(): Promise<void> {
    const all = await this.getAll();
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

    const cleaned = Object.entries(all).reduce(
      (acc, [key, value]) => {
        // Keep if seen recently or dismissed forever
        if (
          value.lastSeenAt.getTime() > ninetyDaysAgo ||
          value.dismissedForever
        ) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, LearningTelemetry>,
    );

    await AsyncStorage.setItem(LEARNING_KEY, JSON.stringify(cleaned));
  },

  /**
   * Clear all learning data (for testing or reset)
   */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(LEARNING_KEY);
  },
};
