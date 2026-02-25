import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const expensesTable = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  dateMs: integer("date_ms").notNull(),
  description: text("description").notNull(),
  currency: text("currency").notNull(),
  imageUri: text("image_uri"),
  aiDetected: integer("ai_detected", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull(),
});

export const groceryItemsTable = sqliteTable("grocery_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameNormalized: text("name_normalized").notNull(),
  quantity: text("quantity").notNull(),
  price: real("price"),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
  category: text("category").notNull(),
  templateId: text("template_id"),
  createdAtMs: integer("created_at_ms").notNull(),
  expenseId: text("expense_id"),
  expenseCategory: text("expense_category"),
  aiDetected: integer("ai_detected", { mode: "boolean" }).notNull().default(false),
  checkedAtMs: integer("checked_at_ms"),
  imageUri: text("image_uri"),
  sortOrder: integer("sort_order").notNull(),
});

export const settingsTable = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),
  currencyCode: text("currency_code").notNull(),
  currencySymbol: text("currency_symbol").notNull(),
  currencyName: text("currency_name").notNull(),
  theme: text("theme").notNull(),
  language: text("language").notNull(),
});

export const templatesTable = sqliteTable("templates", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  productNameDisplay: text("product_name_display").notNull(),
  productNameNormalized: text("product_name_normalized").notNull(),
  defaultQuantity: text("default_quantity").notNull(),
  defaultPrice: real("default_price").notNull(),
  category: text("category").notNull(),
  source: text("source").notNull(),
  usageCount: integer("usage_count").notNull(),
  lastUsedAtMs: integer("last_used_at_ms").notNull(),
  createdAtMs: integer("created_at_ms").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const learningTelemetryTable = sqliteTable("learning_telemetry", {
  productNameNormalized: text("product_name_normalized").primaryKey(),
  userId: text("user_id").notNull(),
  totalSeenCount: integer("total_seen_count").notNull(),
  lastSeenAtMs: integer("last_seen_at_ms").notNull(),
  lastSuggestedAtMs: integer("last_suggested_at_ms"),
  dismissedForever: integer("dismissed_forever", { mode: "boolean" })
    .notNull()
    .default(false),
  categoryFrequencyJson: text("category_frequency_json").notNull(),
  priceHistoryJson: text("price_history_json").notNull(),
  quantityHistoryJson: text("quantity_history_json").notNull(),
});

export const onboardingTipsTable = sqliteTable("onboarding_tips", {
  screenKey: text("screen_key").primaryKey(),
  dismissed: integer("dismissed", { mode: "boolean" }).notNull().default(false),
});

export const appMetaTable = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const aiCacheTable = sqliteTable("ai_cache", {
  cacheKey: text("cache_key").primaryKey(),
  cacheType: text("cache_type").notNull(),
  valueJson: text("value_json").notNull(),
  expiresAtMs: integer("expires_at_ms").notNull(),
  createdAtMs: integer("created_at_ms").notNull(),
  hitCount: integer("hit_count").notNull().default(0),
});
