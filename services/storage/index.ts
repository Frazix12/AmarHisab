import { db, ensureDatabaseInitialized } from "@/services/db/client";
import {
  aiCacheTable,
  appMetaTable,
  expensesTable,
  groceryItemsTable,
  learningTelemetryTable,
  onboardingTipsTable,
  settingsTable,
  templatesTable,
} from "@/services/db/schema";
import { Expense, GroceryItem, UserSettings } from "@/types";
import { asc, eq } from "drizzle-orm";
import * as SecureStore from "expo-secure-store";

const GEMINI_API_KEY_STORAGE_KEY = "amar_hisab_gemini_api_key";
const ELEVENLABS_API_KEY_STORAGE_KEY = "amar_hisab_elevenlabs_api_key";
const APP_UPDATE_FINGERPRINT_KEY = "app_update_fingerprint";

// Maximum storage sizes to prevent abuse
const MAX_EXPENSES = 10000;
const MAX_GROCERY_ITEMS = 1000;
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validate JSON data size before saving
 */
const validateStorageSize = (data: string): boolean => {
  return data.length <= MAX_STORAGE_SIZE;
};

const setSecureItem = async (key: string, value: string) => {
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (error) {
    console.error("Error saving to SecureStore:", error);
  }
};

const getSecureItem = async (key: string) => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error("Error reading from SecureStore:", error);
    return null;
  }
};

const deleteSecureItem = async (key: string) => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error("Error deleting from SecureStore:", error);
  }
};

const toExpenseRow = (expense: Expense, sortOrder: number) => ({
  id: expense.id,
  amount: expense.amount,
  category: expense.category,
  dateMs: expense.date.getTime(),
  description: expense.description,
  currency: expense.currency,
  imageUri: expense.imageUri ?? null,
  aiDetected: !!expense.aiDetected,
  sortOrder,
});

const toGroceryRow = (item: GroceryItem, sortOrder: number) => ({
  id: item.id,
  name: item.name,
  nameNormalized: item.nameNormalized,
  quantity: item.quantity,
  price: item.price,
  checked: item.checked,
  category: item.category,
  templateId: item.templateId ?? null,
  createdAtMs: item.createdAt.getTime(),
  expenseId: item.expenseId ?? null,
  expenseCategory: item.expenseCategory ?? null,
  aiDetected: !!item.aiDetected,
  checkedAtMs: item.checkedAt ? item.checkedAt.getTime() : null,
  imageUri: item.imageUri ?? null,
  sortOrder,
});

// Expenses
export interface SaveExpensesResult {
  savedCount: number;
  totalCount: number;
  truncated: boolean;
}

export const saveExpenses = async (expenses: Expense[]): Promise<SaveExpensesResult> => {
  if (expenses.length > MAX_EXPENSES) {
    throw new Error(
      `Cannot save expenses: received ${expenses.length} items, maximum is ${MAX_EXPENSES}.`,
    );
  }

  const jsonValue = JSON.stringify(expenses);
  if (!validateStorageSize(jsonValue)) {
    throw new Error("Cannot save expenses: payload exceeds storage size limit.");
  }

  await ensureDatabaseInitialized();
  await db.delete(expensesTable);

  if (expenses.length > 0) {
    await db.insert(expensesTable).values(expenses.map((expense, index) => toExpenseRow(expense, index)));
  }

  return {
    savedCount: expenses.length,
    totalCount: expenses.length,
    truncated: false,
  };
};

export const loadExpenses = async (): Promise<Expense[]> => {
  try {
    await ensureDatabaseInitialized();
    const rows = await db.select().from(expensesTable).orderBy(asc(expensesTable.sortOrder));

    return rows.map((row: typeof expensesTable.$inferSelect) => ({
      id: row.id,
      amount: Number(row.amount),
      category: row.category as Expense["category"],
      date: new Date(row.dateMs),
      description: row.description,
      currency: row.currency,
      imageUri: row.imageUri ?? undefined,
      aiDetected: row.aiDetected || undefined,
    }));
  } catch (error) {
    console.error("Error loading expenses:", error);
    return [];
  }
};

// Grocery Items
export const saveGroceryItems = async (items: GroceryItem[]): Promise<void> => {
  try {
    const limitedItems = items.slice(-MAX_GROCERY_ITEMS);
    const jsonValue = JSON.stringify(limitedItems);

    if (!validateStorageSize(jsonValue)) {
      console.error("Grocery items data too large to save");
      return;
    }

    await ensureDatabaseInitialized();
    await db.delete(groceryItemsTable);

    if (limitedItems.length > 0) {
      await db
        .insert(groceryItemsTable)
        .values(limitedItems.map((item, index) => toGroceryRow(item, index)));
    }
  } catch (error) {
    console.error("Error saving grocery items:", error);
  }
};

export const loadGroceryItems = async (): Promise<GroceryItem[]> => {
  try {
    await ensureDatabaseInitialized();
    const rows = await db
      .select()
      .from(groceryItemsTable)
      .orderBy(asc(groceryItemsTable.sortOrder));

    return rows.map((row: typeof groceryItemsTable.$inferSelect) => ({
      id: row.id,
      name: row.name,
      nameNormalized: row.nameNormalized || row.name.toLowerCase().trim(),
      quantity: row.quantity,
      price:
        row.price === null || Number(row.price) <= 0
          ? null
          : Number(row.price),
      checked: !!row.checked,
      category: row.category as GroceryItem["category"],
      templateId: row.templateId ?? undefined,
      createdAt: new Date(row.createdAtMs),
      expenseId: row.expenseId ?? undefined,
      expenseCategory: row.expenseCategory
        ? (row.expenseCategory as GroceryItem["expenseCategory"])
        : undefined,
      aiDetected: row.aiDetected || undefined,
      checkedAt: row.checkedAtMs ? new Date(row.checkedAtMs) : undefined,
      imageUri: row.imageUri ?? undefined,
    }));
  } catch (error) {
    console.error("Error loading grocery items:", error);
    return [];
  }
};

// Settings
export const saveSettings = async (settings: UserSettings): Promise<void> => {
  try {
    const { geminiApiKey, elevenLabsApiKey, ...publicSettings } = settings;

    await ensureDatabaseInitialized();
    await db
      .delete(settingsTable)
      .where(eq(settingsTable.id, 1));

    await db.insert(settingsTable).values({
      id: 1,
      currencyCode: publicSettings.currency.code,
      currencySymbol: publicSettings.currency.symbol,
      currencyName: publicSettings.currency.name,
      theme: publicSettings.theme,
      language: publicSettings.language,
    });

    if (geminiApiKey) {
      await setSecureItem(GEMINI_API_KEY_STORAGE_KEY, geminiApiKey);
    } else {
      await deleteSecureItem(GEMINI_API_KEY_STORAGE_KEY);
    }

    if (elevenLabsApiKey) {
      await setSecureItem(ELEVENLABS_API_KEY_STORAGE_KEY, elevenLabsApiKey);
    } else {
      await deleteSecureItem(ELEVENLABS_API_KEY_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Error saving settings:", error);
  }
};

export const loadSettings = async (): Promise<UserSettings | null> => {
  try {
    await ensureDatabaseInitialized();
    const rows = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1));

    if (rows.length === 0) {
      return null;
    }

    const [geminiApiKey, elevenLabsApiKey] = await Promise.all([
      getSecureItem(GEMINI_API_KEY_STORAGE_KEY),
      getSecureItem(ELEVENLABS_API_KEY_STORAGE_KEY),
    ]);

    const publicSettings = rows[0];

    return {
      currency: {
        code: publicSettings.currencyCode,
        symbol: publicSettings.currencySymbol,
        name: publicSettings.currencyName,
      },
      theme: publicSettings.theme as UserSettings["theme"],
      language: publicSettings.language,
      geminiApiKey: geminiApiKey || undefined,
      elevenLabsApiKey: elevenLabsApiKey || undefined,
    };
  } catch (error) {
    console.error("Error loading settings:", error);
    return null;
  }
};

// Clear all data (useful for reset)
export const clearAllData = async (): Promise<void> => {
  try {
    await ensureDatabaseInitialized();

    await Promise.all([
      db.delete(expensesTable),
      db.delete(groceryItemsTable),
      db.delete(settingsTable),
      db.delete(templatesTable),
      db.delete(learningTelemetryTable),
      db.delete(onboardingTipsTable),
      db.delete(aiCacheTable),
      db.delete(appMetaTable).where(eq(appMetaTable.key, APP_UPDATE_FINGERPRINT_KEY)),
      deleteSecureItem(GEMINI_API_KEY_STORAGE_KEY),
      deleteSecureItem(ELEVENLABS_API_KEY_STORAGE_KEY),
    ]);
  } catch (error) {
    console.error("Error clearing data:", error);
  }
};

export const loadAppUpdateFingerprint = async (): Promise<string | null> => {
  try {
    await ensureDatabaseInitialized();
    const rows = await db
      .select({ value: appMetaTable.value })
      .from(appMetaTable)
      .where(eq(appMetaTable.key, APP_UPDATE_FINGERPRINT_KEY));
    return rows[0]?.value ?? null;
  } catch (error) {
    console.error("Error loading app update fingerprint:", error);
    return null;
  }
};

export const saveAppUpdateFingerprint = async (
  fingerprint: string,
): Promise<void> => {
  try {
    await ensureDatabaseInitialized();
    await db
      .delete(appMetaTable)
      .where(eq(appMetaTable.key, APP_UPDATE_FINGERPRINT_KEY));
    await db.insert(appMetaTable).values({
      key: APP_UPDATE_FINGERPRINT_KEY,
      value: fingerprint,
    });
  } catch (error) {
    console.error("Error saving app update fingerprint:", error);
  }
};

export const loadOnboardingTipDismissed = async (
  screenKey: "expenses" | "grocery",
): Promise<boolean> => {
  try {
    await ensureDatabaseInitialized();
    const rows = await db
      .select({ dismissed: onboardingTipsTable.dismissed })
      .from(onboardingTipsTable)
      .where(eq(onboardingTipsTable.screenKey, screenKey));
    return !!rows[0]?.dismissed;
  } catch (error) {
    console.error("Error loading onboarding tip dismissal:", error);
    return false;
  }
};

export const saveOnboardingTipDismissed = async (
  screenKey: "expenses" | "grocery",
): Promise<void> => {
  try {
    await ensureDatabaseInitialized();
    await db
      .delete(onboardingTipsTable)
      .where(eq(onboardingTipsTable.screenKey, screenKey));
    await db.insert(onboardingTipsTable).values({
      screenKey,
      dismissed: true,
    });
  } catch (error) {
    console.error("Error saving onboarding tip dismissal:", error);
  }
};
