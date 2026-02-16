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
import { asc, eq, inArray, notInArray } from "drizzle-orm";
import * as SecureStore from "expo-secure-store";

const GEMINI_API_KEY_STORAGE_KEY = "amar_hisab_gemini_api_key";
const ELEVENLABS_API_KEY_STORAGE_KEY = "amar_hisab_elevenlabs_api_key";
const APP_UPDATE_FINGERPRINT_KEY = "app_update_fingerprint";

// Maximum storage sizes to prevent abuse
const MAX_EXPENSES = 10000;
const MAX_GROCERY_ITEMS = 1000;
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB
const WRITE_RETRY_DELAYS_MS = [180, 420, 960] as const;

let writeQueue = Promise.resolve();

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const isTransientSqliteError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("sqlite_busy") ||
    message.includes("database is locked") ||
    message.includes("lock")
  );
};

const runWithRetry = async <T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> => {
  for (let attempt = 0; attempt <= WRITE_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === WRITE_RETRY_DELAYS_MS.length;
      if (!isTransientSqliteError(error) || isLastAttempt) {
        throw error;
      }

      const jitterMs = Math.floor(Math.random() * 120);
      const delayMs = WRITE_RETRY_DELAYS_MS[attempt] + jitterMs;
      console.warn(
        `Retrying storage operation (${operationName}) after transient error`,
        { attempt: attempt + 1, delayMs },
      );
      await sleep(delayMs);
    }
  }

  throw new Error(`Storage operation failed unexpectedly: ${operationName}`);
};

const runQueuedWrite = <T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> => {
  const queuedOperation = writeQueue.then(
    () => runWithRetry(operation, operationName),
    () => runWithRetry(operation, operationName),
  );

  writeQueue = queuedOperation.then(
    () => undefined,
    () => undefined,
  );

  return queuedOperation;
};

const getExpenseSortOrder = (expense: Expense): number => {
  const fromDate = expense.date.getTime();
  return Number.isFinite(fromDate) ? fromDate : Date.now();
};

const getGrocerySortOrder = (item: GroceryItem): number => {
  const fromDate = item.createdAt.getTime();
  return Number.isFinite(fromDate) ? fromDate : Date.now();
};

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

  await runQueuedWrite(async () => {
    await ensureDatabaseInitialized();

    if (expenses.length === 0) {
      await db.delete(expensesTable);
      return;
    }

    const ids = expenses.map((expense) => expense.id);
    await db.delete(expensesTable).where(notInArray(expensesTable.id, ids));

    for (const [index, expense] of expenses.entries()) {
      const row = toExpenseRow(expense, index);
      await db.insert(expensesTable).values(row).onConflictDoUpdate({
        target: expensesTable.id,
        set: row,
      });
    }
  }, "save_expenses_snapshot");

  return {
    savedCount: expenses.length,
    totalCount: expenses.length,
    truncated: false,
  };
};

export const upsertExpense = async (expense: Expense): Promise<void> => {
  await runQueuedWrite(async () => {
    await ensureDatabaseInitialized();
    const row = toExpenseRow(expense, getExpenseSortOrder(expense));
    await db.insert(expensesTable).values(row).onConflictDoUpdate({
      target: expensesTable.id,
      set: row,
    });
  }, "upsert_expense");
};

export const updateExpenseById = async (
  id: string,
  updates: Partial<Expense>,
): Promise<void> => {
  const setPayload: Partial<typeof expensesTable.$inferInsert> = {};

  if (updates.amount !== undefined) {
    setPayload.amount = updates.amount;
  }
  if (updates.category !== undefined) {
    setPayload.category = updates.category;
  }
  if (updates.date !== undefined) {
    setPayload.dateMs = updates.date.getTime();
  }
  if (updates.description !== undefined) {
    setPayload.description = updates.description;
  }
  if (updates.currency !== undefined) {
    setPayload.currency = updates.currency;
  }
  if (updates.imageUri !== undefined) {
    setPayload.imageUri = updates.imageUri ?? null;
  }
  if (updates.aiDetected !== undefined) {
    setPayload.aiDetected = !!updates.aiDetected;
  }

  if (Object.keys(setPayload).length === 0) {
    return;
  }

  await runQueuedWrite(async () => {
    await ensureDatabaseInitialized();
    await db.update(expensesTable).set(setPayload).where(eq(expensesTable.id, id));
  }, "update_expense_by_id");
};

export const deleteExpenseById = async (id: string): Promise<void> => {
  await runQueuedWrite(async () => {
    await ensureDatabaseInitialized();
    await db.delete(expensesTable).where(eq(expensesTable.id, id));
  }, "delete_expense_by_id");
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

    await runQueuedWrite(async () => {
      await ensureDatabaseInitialized();

      if (limitedItems.length === 0) {
        await db.delete(groceryItemsTable);
        return;
      }

      const ids = limitedItems.map((item) => item.id);
      await db.delete(groceryItemsTable).where(notInArray(groceryItemsTable.id, ids));

      for (const [index, item] of limitedItems.entries()) {
        const row = toGroceryRow(item, index);
        await db.insert(groceryItemsTable).values(row).onConflictDoUpdate({
          target: groceryItemsTable.id,
          set: row,
        });
      }
    }, "save_grocery_items_snapshot");
  } catch (error) {
    console.error("Error saving grocery items:", error);
  }
};

export const upsertGroceryItem = async (item: GroceryItem): Promise<void> => {
  await runQueuedWrite(async () => {
    await ensureDatabaseInitialized();
    const row = toGroceryRow(item, getGrocerySortOrder(item));
    await db.insert(groceryItemsTable).values(row).onConflictDoUpdate({
      target: groceryItemsTable.id,
      set: row,
    });
  }, "upsert_grocery_item");
};

export const updateGroceryItemById = async (
  id: string,
  updates: Partial<GroceryItem>,
): Promise<void> => {
  const setPayload: Partial<typeof groceryItemsTable.$inferInsert> = {};

  if (updates.name !== undefined) {
    setPayload.name = updates.name;
  }
  if (updates.nameNormalized !== undefined) {
    setPayload.nameNormalized = updates.nameNormalized;
  }
  if (updates.quantity !== undefined) {
    setPayload.quantity = updates.quantity;
  }
  if (updates.price !== undefined) {
    setPayload.price = updates.price;
  }
  if (updates.checked !== undefined) {
    setPayload.checked = !!updates.checked;
  }
  if (updates.category !== undefined) {
    setPayload.category = updates.category;
  }
  if (updates.templateId !== undefined) {
    setPayload.templateId = updates.templateId ?? null;
  }
  if (updates.createdAt !== undefined) {
    setPayload.createdAtMs = updates.createdAt.getTime();
  }
  if (updates.expenseId !== undefined) {
    setPayload.expenseId = updates.expenseId ?? null;
  }
  if (updates.expenseCategory !== undefined) {
    setPayload.expenseCategory = updates.expenseCategory ?? null;
  }
  if (updates.aiDetected !== undefined) {
    setPayload.aiDetected = !!updates.aiDetected;
  }
  if (updates.checkedAt !== undefined) {
    setPayload.checkedAtMs = updates.checkedAt ? updates.checkedAt.getTime() : null;
  }
  if (updates.imageUri !== undefined) {
    setPayload.imageUri = updates.imageUri ?? null;
  }

  if (Object.keys(setPayload).length === 0) {
    return;
  }

  await runQueuedWrite(async () => {
    await ensureDatabaseInitialized();
    await db
      .update(groceryItemsTable)
      .set(setPayload)
      .where(eq(groceryItemsTable.id, id));
  }, "update_grocery_item_by_id");
};

export const deleteGroceryItemById = async (id: string): Promise<void> => {
  await runQueuedWrite(async () => {
    await ensureDatabaseInitialized();
    await db.delete(groceryItemsTable).where(eq(groceryItemsTable.id, id));
  }, "delete_grocery_item_by_id");
};

export const deleteGroceryItemsByIds = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  await runQueuedWrite(async () => {
    await ensureDatabaseInitialized();
    await db.delete(groceryItemsTable).where(inArray(groceryItemsTable.id, ids));
  }, "delete_grocery_items_by_ids");
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

    await runQueuedWrite(async () => {
      await ensureDatabaseInitialized();
      await db.insert(settingsTable).values({
        id: 1,
        currencyCode: publicSettings.currency.code,
        currencySymbol: publicSettings.currency.symbol,
        currencyName: publicSettings.currency.name,
        theme: publicSettings.theme,
        language: publicSettings.language,
      }).onConflictDoUpdate({
        target: settingsTable.id,
        set: {
          currencyCode: publicSettings.currency.code,
          currencySymbol: publicSettings.currency.symbol,
          currencyName: publicSettings.currency.name,
          theme: publicSettings.theme,
          language: publicSettings.language,
        },
      });
    }, "save_settings");

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
    await runQueuedWrite(async () => {
      await ensureDatabaseInitialized();
      await db.delete(expensesTable);
      await db.delete(groceryItemsTable);
      await db.delete(settingsTable);
      await db.delete(templatesTable);
      await db.delete(learningTelemetryTable);
      await db.delete(onboardingTipsTable);
      await db.delete(aiCacheTable);
      await db
        .delete(appMetaTable)
        .where(eq(appMetaTable.key, APP_UPDATE_FINGERPRINT_KEY));
    }, "clear_all_data");

    await Promise.all([
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
    await runQueuedWrite(async () => {
      await ensureDatabaseInitialized();
      await db.insert(appMetaTable).values({
        key: APP_UPDATE_FINGERPRINT_KEY,
        value: fingerprint,
      }).onConflictDoUpdate({
        target: appMetaTable.key,
        set: {
          value: fingerprint,
        },
      });
    }, "save_app_update_fingerprint");
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
    await runQueuedWrite(async () => {
      await ensureDatabaseInitialized();
      await db.insert(onboardingTipsTable).values({
        screenKey,
        dismissed: true,
      }).onConflictDoUpdate({
        target: onboardingTipsTable.screenKey,
        set: {
          dismissed: true,
        },
      });
    }, "save_onboarding_tip_dismissed");
  } catch (error) {
    console.error("Error saving onboarding tip dismissal:", error);
  }
};
