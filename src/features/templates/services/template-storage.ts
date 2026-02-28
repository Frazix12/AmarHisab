import { db, ensureDatabaseInitialized } from "@/services/db/client";
import { templatesTable } from "@/services/db/schema";
import { GroceryTemplate, TemplateMatch } from "@/types/template";
import { asc, eq } from "drizzle-orm";
import { calculateMatchConfidence } from "./template-utils";

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

const toModel = (row: typeof templatesTable.$inferSelect): GroceryTemplate => ({
  id: row.id,
  userId: row.userId,
  productNameDisplay: row.productNameDisplay,
  productNameNormalized: row.productNameNormalized,
  defaultQuantity: row.defaultQuantity,
  defaultPrice: Number(row.defaultPrice),
  category: row.category as GroceryTemplate["category"],
  source: row.source as GroceryTemplate["source"],
  usageCount: row.usageCount,
  lastUsedAt: new Date(row.lastUsedAtMs),
  createdAt: new Date(row.createdAtMs),
});

/**
 * Storage operations for grocery templates
 */
export const TemplateStorage = {
  /**
   * Get all templates for current user
   */
  async getAll(): Promise<GroceryTemplate[]> {
    try {
      await ensureDatabaseInitialized();
      const rows = await db.select().from(templatesTable).orderBy(asc(templatesTable.sortOrder));
      return rows.map(toModel);
    } catch (error) {
      console.error("Error loading templates:", error);
      return [];
    }
  },

  /**
   * Get template by ID
   */
  async getById(id: string): Promise<GroceryTemplate | null> {
    await ensureDatabaseInitialized();
    const rows = await db.select().from(templatesTable).where(eq(templatesTable.id, id));
    return rows.length > 0 ? toModel(rows[0]) : null;
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
      await ensureDatabaseInitialized();
      const templates = await this.getAll();

      const newTemplate: GroceryTemplate = {
        ...template,
        id: `template_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        usageCount: 0,
        lastUsedAt: new Date(),
        createdAt: new Date(),
      };

      await db.insert(templatesTable).values({
        id: newTemplate.id,
        userId: newTemplate.userId,
        productNameDisplay: newTemplate.productNameDisplay,
        productNameNormalized: newTemplate.productNameNormalized,
        defaultQuantity: newTemplate.defaultQuantity,
        defaultPrice: newTemplate.defaultPrice,
        category: newTemplate.category,
        source: newTemplate.source,
        usageCount: 0,
        lastUsedAtMs: newTemplate.lastUsedAt.getTime(),
        createdAtMs: newTemplate.createdAt.getTime(),
        sortOrder: templates.length,
      });

      return newTemplate;
    });
  },

  /**
   * Update existing template
   */
  async update(id: string, updates: Partial<GroceryTemplate>): Promise<void> {
    return withLock(async () => {
      await ensureDatabaseInitialized();

      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`Template not found: ${id}`);
      }

      const {
        id: _ignoredId,
        createdAt: _ignoredCreatedAt,
        usageCount: _ignoredUsageCount,
        userId: _ignoredUserId,
        ...sanitizedUpdates
      } = updates;

      const setPayload: Partial<typeof templatesTable.$inferInsert> = {};

      if (sanitizedUpdates.productNameDisplay !== undefined) {
        setPayload.productNameDisplay = sanitizedUpdates.productNameDisplay;
      }
      if (sanitizedUpdates.productNameNormalized !== undefined) {
        setPayload.productNameNormalized = sanitizedUpdates.productNameNormalized;
      }
      if (sanitizedUpdates.defaultQuantity !== undefined) {
        setPayload.defaultQuantity = sanitizedUpdates.defaultQuantity;
      }
      if (sanitizedUpdates.defaultPrice !== undefined) {
        setPayload.defaultPrice = sanitizedUpdates.defaultPrice;
      }
      if (sanitizedUpdates.category !== undefined) {
        setPayload.category = sanitizedUpdates.category;
      }
      if (sanitizedUpdates.source !== undefined) {
        setPayload.source = sanitizedUpdates.source;
      }
      if (sanitizedUpdates.lastUsedAt !== undefined) {
        setPayload.lastUsedAtMs = sanitizedUpdates.lastUsedAt.getTime();
      }

      if (Object.keys(setPayload).length === 0) {
        return;
      }

      await db.update(templatesTable).set(setPayload).where(eq(templatesTable.id, id));
    });
  },

  /**
   * Delete template
   */
  async delete(id: string): Promise<void> {
    return withLock(async () => {
      await ensureDatabaseInitialized();

      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`Template not found: ${id}`);
      }

      await db.delete(templatesTable).where(eq(templatesTable.id, id));
    });
  },

  /**
   * Increment usage count and update last used timestamp
   */
  async incrementUsage(id: string): Promise<void> {
    return withLock(async () => {
      await ensureDatabaseInitialized();

      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`Template not found: ${id}`);
      }

      await db
        .update(templatesTable)
        .set({
          usageCount: existing.usageCount + 1,
          lastUsedAtMs: Date.now(),
        })
        .where(eq(templatesTable.id, id));
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
          rank: 0,
        });
      }
    }

    return this.rankTemplates(matches);
  },

  /**
   * Rank template matches
   * Priority: confidence > usage count > recency
   */
  rankTemplates(matches: TemplateMatch[]): TemplateMatch[] {
    return matches
      .sort((a, b) => {
        if (a.confidence !== b.confidence) {
          return b.confidence - a.confidence;
        }

        if (a.template.usageCount !== b.template.usageCount) {
          return b.template.usageCount - a.template.usageCount;
        }

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
    await ensureDatabaseInitialized();
    await db.delete(templatesTable);
  },
};
