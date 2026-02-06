import { GroceryTemplate, TemplateMatch } from "@/types/template";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { calculateMatchConfidence } from "./template-utils";

const TEMPLATES_KEY = "@amarhisab:templates";
let operationLock: Promise<void> = Promise.resolve();

const withLock = async <T>(operation: () => Promise<T>): Promise<T> => {
  const previousLock = operationLock;
  let releaseLock: () => void = () => {};

  operationLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  await previousLock;

  try {
    return await operation();
  } finally {
    releaseLock();
  }
};

/**
 * Storage operations for grocery templates
 */
export const TemplateStorage = {
  /**
   * Get all templates for current user
   */
  async getAll(): Promise<GroceryTemplate[]> {
    try {
      const data = await AsyncStorage.getItem(TEMPLATES_KEY);
      if (!data) return [];

      const templates = JSON.parse(data);
      // Convert date strings back to Date objects
      return templates.map((t: any) => ({
        ...t,
        lastUsedAt: new Date(t.lastUsedAt),
        createdAt: new Date(t.createdAt),
      }));
    } catch (error) {
      console.error("Error loading templates:", error);
      return [];
    }
  },

  /**
   * Get template by ID
   */
  async getById(id: string): Promise<GroceryTemplate | null> {
    const templates = await this.getAll();
    return templates.find((t) => t.id === id) || null;
  },

  /**
   * Create new template
   */
  async create(
    template: Omit<
      GroceryTemplate,
      "id" | "createdAt" | "lastUsedAt" | "usageCount"
    >,
  ): Promise<GroceryTemplate> {
    return withLock(async () => {
      const templates = await this.getAll();

      const newTemplate: GroceryTemplate = {
        ...template,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        usageCount: 0,
        lastUsedAt: new Date(),
        createdAt: new Date(),
      };

      templates.push(newTemplate);
      await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));

      return newTemplate;
    });
  },

  /**
   * Update existing template
   */
  async update(id: string, updates: Partial<GroceryTemplate>): Promise<void> {
    return withLock(async () => {
      const templates = await this.getAll();
      const index = templates.findIndex((t) => t.id === id);

      if (index === -1) {
        throw new Error(`Template not found: ${id}`);
      }

      const {
        id: _ignoredId,
        createdAt: _ignoredCreatedAt,
        usageCount: _ignoredUsageCount,
        userId: _ignoredUserId,
        ...sanitizedUpdates
      } = updates;

      templates[index] = { ...templates[index], ...sanitizedUpdates };
      await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    });
  },

  /**
   * Delete template
   */
  async delete(id: string): Promise<void> {
    return withLock(async () => {
      const templates = await this.getAll();
      const filtered = templates.filter((t) => t.id !== id);

      if (filtered.length === templates.length) {
        throw new Error(`Template not found: ${id}`);
      }

      await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
    });
  },

  /**
   * Increment usage count and update last used timestamp
   */
  async incrementUsage(id: string): Promise<void> {
    return withLock(async () => {
      const templates = await this.getAll();
      const index = templates.findIndex((t) => t.id === id);

      if (index === -1) {
        throw new Error(`Template not found: ${id}`);
      }

      templates[index].usageCount += 1;
      templates[index].lastUsedAt = new Date();
      await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    });
  },

  /**
   * Find matching templates for input string
   * Returns only matches with confidence > 0
   */
  async findMatching(normalizedName: string): Promise<TemplateMatch[]> {
    if (!normalizedName || normalizedName.trim().length === 0) {
      return [];
    }

    const templates = await this.getAll();
    const matches: TemplateMatch[] = [];

    for (const template of templates) {
      const confidence = calculateMatchConfidence(
        normalizedName,
        template.productNameNormalized,
      );

      if (confidence > 0) {
        matches.push({
          template,
          confidence,
          rank: 0, // Will be set by ranking function
        });
      }
    }

    // Rank by confidence, usage, and recency
    return this.rankTemplates(matches);
  },

  /**
   * Rank template matches
   * Priority: confidence > usage count > recency
   */
  rankTemplates(matches: TemplateMatch[]): TemplateMatch[] {
    return matches
      .sort((a, b) => {
        // 1. Confidence score (most important)
        if (a.confidence !== b.confidence) {
          return b.confidence - a.confidence;
        }

        // 2. Usage frequency
        if (a.template.usageCount !== b.template.usageCount) {
          return b.template.usageCount - a.template.usageCount;
        }

        // 3. Recency
        return (
          b.template.lastUsedAt.getTime() - a.template.lastUsedAt.getTime()
        );
      })
      .map((match, index) => ({ ...match, rank: index + 1 }));
  },

  /**
   * Clear all templates (for testing or reset)
   */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(TEMPLATES_KEY);
  },
};
