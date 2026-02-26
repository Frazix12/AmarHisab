import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

const DATABASE_NAME = "amar_hisab.db";
const SCHEMA_VERSION = "1";

let _db: SQLiteDatabase | null = null;

const getDb = (): SQLiteDatabase => {
  if (!_db) {
    _db = openDatabaseSync(DATABASE_NAME);
  }
  return _db;
};

export const db = drizzle(getDb());

let initializationPromise: Promise<void> | null = null;

export const ensureDatabaseInitialized = async (): Promise<void> => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      await getDb().execAsync("PRAGMA journal_mode = WAL;");

      await getDb().execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date_ms INTEGER NOT NULL,
        description TEXT NOT NULL,
        currency TEXT NOT NULL,
        image_uri TEXT,
        ai_detected INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS grocery_items (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        name_normalized TEXT NOT NULL,
        quantity TEXT NOT NULL,
        price REAL,
        checked INTEGER NOT NULL DEFAULT 0,
        category TEXT NOT NULL,
        template_id TEXT,
        created_at_ms INTEGER NOT NULL,
        expense_id TEXT,
        expense_category TEXT,
        ai_detected INTEGER NOT NULL DEFAULT 0,
        checked_at_ms INTEGER,
        image_uri TEXT,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY NOT NULL CHECK(id = 1),
        currency_code TEXT NOT NULL,
        currency_symbol TEXT NOT NULL,
        currency_name TEXT NOT NULL,
        theme TEXT NOT NULL,
        language TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        product_name_display TEXT NOT NULL,
        product_name_normalized TEXT NOT NULL,
        default_quantity TEXT NOT NULL,
        default_price REAL NOT NULL,
        category TEXT NOT NULL,
        source TEXT NOT NULL,
        usage_count INTEGER NOT NULL,
        last_used_at_ms INTEGER NOT NULL,
        created_at_ms INTEGER NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS learning_telemetry (
        product_name_normalized TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        total_seen_count INTEGER NOT NULL,
        last_seen_at_ms INTEGER NOT NULL,
        last_suggested_at_ms INTEGER,
        dismissed_forever INTEGER NOT NULL DEFAULT 0,
        category_frequency_json TEXT NOT NULL,
        price_history_json TEXT NOT NULL,
        quantity_history_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS onboarding_tips (
        screen_key TEXT PRIMARY KEY NOT NULL,
        dismissed INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ai_cache (
        cache_key TEXT PRIMARY KEY NOT NULL,
        cache_type TEXT NOT NULL,
        value_json TEXT NOT NULL,
        expires_at_ms INTEGER NOT NULL,
        created_at_ms INTEGER NOT NULL,
        hit_count INTEGER NOT NULL DEFAULT 0
      );
    `);

      await getDb().runAsync(
        "INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)",
        ["schema_version", SCHEMA_VERSION],
      );
    } catch (error) {
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
};
