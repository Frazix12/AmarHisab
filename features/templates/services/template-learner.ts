import { GroceryCategory, GroceryItem } from "@/types";
import { LearningCandidate, LearningTelemetry } from "@/types/template";
import { LearningStorage } from "./learning-storage";
import { TemplateStorage } from "./template-storage";
import { median, mode } from "./template-utils";

/**
 * Auto-learning algorithm to detect patterns and suggest templates
 */
export const TemplateLearner = {
  /**
   * Detect learning candidates from grocery items
   * Returns at most 1 suggestion per call (rate limited)
   */
  async detectLearningCandidates(
    groceryItems: GroceryItem[],
  ): Promise<LearningCandidate | null> {
    // Load all existing templates to avoid suggesting duplicates
    const existingTemplates = await TemplateStorage.getAll();
    const existingNormalizedNames = new Set(
      existingTemplates.map((t) => t.productNameNormalized),
    );

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Filter recent items (last 30 days)
    const recentItems = groceryItems.filter(
      (item) => item.createdAt && item.createdAt.getTime() > thirtyDaysAgo,
    );

    // Group by normalized name
    const grouped = recentItems.reduce(
      (acc, item) => {
        const key = item.nameNormalized;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, GroceryItem[]>,
    );

    // Find best candidate
    const candidates: LearningCandidate[] = [];

    for (const [normalizedName, items] of Object.entries(grouped)) {
      // Rule 0: Skip if template already exists for this product
      if (existingNormalizedNames.has(normalizedName)) continue;

      // Rule 0.5: Skip if any item was created from a template
      const hasTemplateAssociation = items.some((item) => item.templateId);
      if (hasTemplateAssociation) continue;

      // Rule 1: At least 3 occurrences
      if (items.length < 3) continue;

      // Check telemetry
      const telemetry = await LearningStorage.getTelemetry(normalizedName);

      // Skip if dismissed forever
      if (telemetry?.dismissedForever) continue;

      // Skip if suggested recently (within 24h)
      if (
        telemetry?.lastSuggestedAt &&
        now - telemetry.lastSuggestedAt.getTime() < 86400000
      ) {
        continue;
      }

      // Rule 2: Category consistency (≥70%)
      const categoryFreq = items.reduce(
        (acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        },
        {} as Record<GroceryCategory, number>,
      );

      const mostFreqCategory = Object.entries(categoryFreq).sort(
        (a, b) => b[1] - a[1],
      )[0];

      const categoryConsistency = mostFreqCategory[1] / items.length;
      if (categoryConsistency < 0.7) continue;

      // Calculate defaults using robust statistics
      const prices = items
        .map((i) => i.price)
        .filter((p): p is number => p !== null && p > 0);
      const quantities = items
        .map((i) => i.quantity)
        .filter((q) => q && q.trim() !== "");

      const medianPrice = prices.length > 0 ? median(prices) : 0;
      const modeQuantity = quantities.length > 0 ? mode(quantities) : "";

      // Only suggest if we have good data
      if (medianPrice === 0 && !modeQuantity) continue;

      candidates.push({
        productName: items[0].name, // Use original display name
        productNameNormalized: normalizedName,
        defaultQuantity: modeQuantity || "",
        defaultPrice: medianPrice,
        category: mostFreqCategory[0] as GroceryCategory,
        confidence: categoryConsistency,
        occurrences: items.length,
      });
    }

    // Sort by confidence * occurrence count
    candidates.sort((a, b) => {
      const scoreA = a.confidence * a.occurrences;
      const scoreB = b.confidence * b.occurrences;
      return scoreB - scoreA;
    });

    // Return top candidate (rate limit: 1 per session)
    return candidates[0] || null;
  },

  /**
   * Update telemetry when grocery item is added
   */
  async trackGroceryItem(item: GroceryItem): Promise<void> {
    const telemetry = await LearningStorage.getTelemetry(item.nameNormalized);

    const now = new Date();

    if (telemetry) {
      // Update existing telemetry
      telemetry.totalSeenCount += 1;
      telemetry.lastSeenAt = now;

      // Update category frequency
      if (!telemetry.categoryFrequency) {
        telemetry.categoryFrequency = {} as Record<GroceryCategory, number>;
      }
      telemetry.categoryFrequency[item.category] =
        (telemetry.categoryFrequency[item.category] || 0) + 1;

      // Update price history (keep last 10)
       if (item.price !== null && item.price > 0) {
        telemetry.priceHistory = [...telemetry.priceHistory, item.price].slice(
          -10,
        );
      }

      // Update quantity history (keep last 10)
      if (item.quantity && item.quantity.trim() !== "") {
        telemetry.quantityHistory = [
          ...telemetry.quantityHistory,
          item.quantity,
        ].slice(-10);
      }

      await LearningStorage.updateTelemetry(telemetry);
    } else {
      // Create new telemetry
      const newTelemetry: LearningTelemetry = {
        userId: "default",
        productNameNormalized: item.nameNormalized,
        totalSeenCount: 1,
        lastSeenAt: now,
        lastSuggestedAt: null,
        dismissedForever: false,
        categoryFrequency: { [item.category]: 1 } as Record<
          GroceryCategory,
          number
        >,
        priceHistory: item.price !== null && item.price > 0 ? [item.price] : [],
        quantityHistory: item.quantity ? [item.quantity] : [],
      };

      await LearningStorage.updateTelemetry(newTelemetry);
    }
  },

  /**
   * Mark suggestion as shown
   */
  async recordSuggestion(normalizedName: string): Promise<void> {
    await LearningStorage.recordSuggestion(normalizedName);
  },

  /**
   * Mark product as dismissed forever
   */
  async dismissForever(normalizedName: string): Promise<void> {
    await LearningStorage.markDismissedForever(normalizedName);
  },
};
