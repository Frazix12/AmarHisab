import { TemplateLearner } from "@/features/templates/services/template-learner";
import { LearningStorage } from "@/features/templates/services/learning-storage";
import { TemplateStorage } from "@/features/templates/services/template-storage";
import { normalizeProductName } from "@/features/templates/services/template-utils";
import { useExpenseStore } from "@/stores/expense-store";
import { useGroceryStore } from "@/stores/grocery-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTemplateStore } from "@/stores/template-store";
import { setElevenLabsApiKey } from "@/services/ai/elevenlabs";
import { detectExpenseCategory, setGeminiApiKey } from "@/services/ai/gemini";
import {
  trackEvent,
  captureError,
  identifyUser,
  resetAnalytics,
  setSuperProperties,
  AnalyticsEvents,
} from "@/services/analytics";
import { getTranslation, TranslationKey } from "@/services/i18n";
import {
  loadExpenses,
  loadGroceryItems,
  loadSettings,
  upsertExpense,
  updateExpenseById,
  deleteExpenseById,
  upsertGroceryItem,
  updateGroceryItemById,
  deleteGroceryItemById,
  deleteGroceryItemsByIds,
  clearAllData as clearStorageData,
  ensureAnalyticsId,
  saveSettings,
} from "@/services/storage";
import {
  CURRENCIES,
  Currency,
  Expense,
  ExpenseCategory,
  GroceryItem,
  UserSettings,
} from "@/types";
import {
  GroceryTemplate,
  LearningCandidate,
  TemplateMatch,
} from "@/types/template";
import { formatNumber as formatNumberUtil } from "@/utils/format";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useColorScheme as useNativeColorScheme, InteractionManager } from "react-native";

interface AppContextType {
  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => string;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => Promise<void>;

  // Grocery
  groceryItems: GroceryItem[];
  addGroceryItem: (
    item: Omit<GroceryItem, "id" | "nameNormalized" | "createdAt">,
  ) => void;
  updateGroceryItem: (id: string, item: Partial<GroceryItem>) => void;
  deleteGroceryItem: (id: string) => void;
  toggleGroceryItem: (id: string) => void;
  clearCompletedGroceryItems: () => void;
  itemPendingCompletion: GroceryItem | null;
  setItemPendingCompletion: (item: GroceryItem | null) => void;
  completeGroceryItem: (id: string, price: number, imageUri?: string) => void;

  // Settings
  settings: UserSettings;
  updateCurrency: (currency: Currency) => void;
  updateTheme: (theme: "light" | "dark" | "system") => void;
  updateLanguage: (language: string) => void;
  updateApiKey: (apiKey: string) => void;
  updateElevenLabsApiKey: (apiKey: string) => void;

  // Computed
  totalExpenses: number;
  todayExpenses: number;
  monthExpenses: number;
  weekExpenses: number;
  todaysExpensesList: Expense[];
  categoryBreakdown: {
    category: ExpenseCategory;
    amount: number;
    percentage: number;
    count: number;
  }[];

  // Translation
  t: TranslationKey;
  formatNumber: (value: number | string) => string;

  // Theme
  colorScheme: "light" | "dark";

  // Templates
  templates: GroceryTemplate[];
  addTemplate: (
    template: Omit<
      GroceryTemplate,
      "id" | "createdAt" | "lastUsedAt" | "usageCount"
    >,
  ) => Promise<GroceryTemplate>;
  updateTemplate: (
    id: string,
    updates: Partial<GroceryTemplate>,
  ) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  findMatchingTemplates: (input: string) => Promise<TemplateMatch[]>;
  applyTemplate: (templateId: string) => Promise<Partial<GroceryItem> | null>;

  // Learning
  checkForSuggestions: () => Promise<LearningCandidate | null>;
  acceptSuggestion: (candidate: LearningCandidate) => Promise<GroceryTemplate>;
  dismissSuggestion: (
    normalizedName: string,
    forever: boolean,
  ) => Promise<void>;
  smartSuggestionsEnabled: boolean;
  toggleSmartSuggestions: () => void;
  clearAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface ThemeSliceContextType {
  colorScheme: "light" | "dark";
}

interface I18nSliceContextType {
  t: TranslationKey;
  formatNumber: (value: number | string) => string;
}

interface ExpenseSliceContextType {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => string;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => Promise<void>;
  totalExpenses: number;
  todayExpenses: number;
  monthExpenses: number;
  weekExpenses: number;
  todaysExpensesList: Expense[];
  categoryBreakdown: {
    category: ExpenseCategory;
    amount: number;
    percentage: number;
    count: number;
  }[];
}

interface GrocerySliceContextType {
  groceryItems: GroceryItem[];
  addGroceryItem: (
    item: Omit<GroceryItem, "id" | "nameNormalized" | "createdAt">,
  ) => void;
  updateGroceryItem: (id: string, item: Partial<GroceryItem>) => void;
  deleteGroceryItem: (id: string) => void;
  toggleGroceryItem: (id: string) => void;
  clearCompletedGroceryItems: () => void;
  itemPendingCompletion: GroceryItem | null;
  setItemPendingCompletion: (item: GroceryItem | null) => void;
  completeGroceryItem: (id: string, price: number, imageUri?: string) => void;
}

interface SettingsSliceContextType {
  settings: UserSettings;
  updateCurrency: (currency: Currency) => void;
  updateTheme: (theme: "light" | "dark" | "system") => void;
  updateLanguage: (language: string) => void;
  updateApiKey: (apiKey: string) => void;
  updateElevenLabsApiKey: (apiKey: string) => void;
  clearAllData: () => Promise<void>;
}

interface TemplateSliceContextType {
  templates: GroceryTemplate[];
  addTemplate: (
    template: Omit<
      GroceryTemplate,
      "id" | "createdAt" | "lastUsedAt" | "usageCount"
    >,
  ) => Promise<GroceryTemplate>;
  updateTemplate: (
    id: string,
    updates: Partial<GroceryTemplate>,
  ) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  findMatchingTemplates: (input: string) => Promise<TemplateMatch[]>;
  applyTemplate: (templateId: string) => Promise<Partial<GroceryItem> | null>;
}

interface LearningSliceContextType {
  checkForSuggestions: () => Promise<LearningCandidate | null>;
  acceptSuggestion: (candidate: LearningCandidate) => Promise<GroceryTemplate>;
  dismissSuggestion: (
    normalizedName: string,
    forever: boolean,
  ) => Promise<void>;
  smartSuggestionsEnabled: boolean;
  toggleSmartSuggestions: () => void;
}

const ThemeSliceContext = createContext<ThemeSliceContextType | undefined>(
  undefined,
);
const I18nSliceContext = createContext<I18nSliceContextType | undefined>(
  undefined,
);
const ExpenseSliceContext = createContext<ExpenseSliceContextType | undefined>(
  undefined,
);
const GrocerySliceContext = createContext<GrocerySliceContextType | undefined>(
  undefined,
);
const SettingsSliceContext = createContext<SettingsSliceContextType | undefined>(
  undefined,
);
const TemplateSliceContext = createContext<TemplateSliceContextType | undefined>(
  undefined,
);
const LearningSliceContext = createContext<LearningSliceContextType | undefined>(
  undefined,
);

const DEFAULT_SETTINGS: UserSettings = {
  currency: CURRENCIES[0], // USD
  theme: "light",
  language: "en",
};

const FALLBACK_GROCERY_TO_EXPENSE_CATEGORY: Record<GroceryItem["category"], ExpenseCategory> = {
  fruits: "food",
  vegetables: "food",
  dairy: "food",
  meat: "food",
  snacks: "food",
  beverages: "food",
  household: "shopping",
  other: "other",
};

export const AppProvider: React.FC<{ children: ReactNode; onReady?: () => void }> = ({
  children,
  onReady,
}) => {
  const nativeColorScheme = useNativeColorScheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [templates, setTemplates] = useState<GroceryTemplate[]>([]);
  const [smartSuggestionsEnabled, setSmartSuggestionsEnabled] = useState(true);
  const [itemPendingCompletion, setItemPendingCompletion] =
    useState<GroceryItem | null>(null);
  const isMountedRef = useRef(true);
  const groceryItemsRef = useRef<GroceryItem[]>([]);
  const settingsRef = useRef<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    groceryItemsRef.current = groceryItems;
  }, [groceryItems]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const createEntityId = useCallback((): string => {
    return Date.now().toString() + Math.random().toString(36).slice(2, 11);
  }, []);

  const handlePersistenceFailure = useCallback(
    (error: unknown, context: string): void => {
      console.error(`Failed to persist ${context}:`, error);
      captureError(error, { context });
    },
    [],
  );

  const getFallbackExpenseCategory = useCallback(
    (groceryCategory: GroceryItem["category"]): ExpenseCategory => {
      return FALLBACK_GROCERY_TO_EXPENSE_CATEGORY[groceryCategory] ?? "other";
    },
    [],
  );

  const resolveExpenseCategoryForGroceryItem = useCallback(
    (item: Pick<GroceryItem, "expenseCategory" | "category">): ExpenseCategory => {
      return item.expenseCategory ?? getFallbackExpenseCategory(item.category);
    },
    [getFallbackExpenseCategory],
  );

  const hasValidGroceryPrice = useCallback(
    (price: GroceryItem["price"]): price is number => {
      return typeof price === "number" && Number.isFinite(price) && price > 0;
    },
    [],
  );

  const cacheExpenseCategoryForGroceryItem = useCallback((item: GroceryItem): void => {
    const fallbackCategory = getFallbackExpenseCategory(item.category);

    Promise.resolve(detectExpenseCategory(item.name))
      .then((detectedCategory) => {
        if (!detectedCategory || !isMountedRef.current) return;

        trackEvent(AnalyticsEvents.AI_CATEGORY_DETECTED, {
          source: "grocery_item",
          detected_category: detectedCategory,
          fallback_category: fallbackCategory,
        });

        let categoryApplied = false;
        setGroceryItems((prev) => {
          const nextItems = prev.map((entry) => {
            if (
              entry.id === item.id &&
              (!entry.expenseCategory || entry.expenseCategory === fallbackCategory)
            ) {
              categoryApplied = true;
              return {
                ...entry,
                expenseCategory: detectedCategory,
              };
            }

            return entry;
          });

          groceryItemsRef.current = nextItems;
          return nextItems;
        });

        const currentEntry = groceryItemsRef.current.find((entry) => entry.id === item.id);
        const shouldPersistCategory =
          categoryApplied &&
          isMountedRef.current &&
          currentEntry?.expenseCategory === detectedCategory;

        if (shouldPersistCategory) {
          void updateGroceryItemById(item.id, {
            expenseCategory: detectedCategory,
          }).catch((error) => {
            handlePersistenceFailure(error, "update_grocery_expense_category");
          });
        }
      })
      .catch((error) => {
        console.error("Failed to detect expense category for grocery item:", error);
      });
  }, [getFallbackExpenseCategory, handlePersistenceFailure]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedExpenses, loadedGrocery, loadedSettings, loadedTemplates] =
          await Promise.all([
            loadExpenses(),
            loadGroceryItems(),
            loadSettings(),
            TemplateStorage.getAll(),
          ]);

        if (!isMountedRef.current) {
          return;
        }

        setExpenses(loadedExpenses);
        setGroceryItems(loadedGrocery);
        setSettings(loadedSettings || DEFAULT_SETTINGS);
        setTemplates(loadedTemplates);
        groceryItemsRef.current = loadedGrocery;
        settingsRef.current = loadedSettings || DEFAULT_SETTINGS;

        // Initialize Zustand stores from DB load
        useExpenseStore.getState()._setExpenses(loadedExpenses);
        useGroceryStore.getState()._setGroceryItems(loadedGrocery);
        useSettingsStore.getState()._setSettings(loadedSettings || DEFAULT_SETTINGS);
        useTemplateStore.getState()._setTemplates(loadedTemplates);

        if (loadedSettings?.geminiApiKey) {
          setGeminiApiKey(loadedSettings.geminiApiKey);
        }

        if (loadedSettings?.elevenLabsApiKey) {
          setElevenLabsApiKey(loadedSettings.elevenLabsApiKey);
        }

        // Defer analytics identification to avoid blocking render
        const effectiveSettings = loadedSettings || DEFAULT_SETTINGS;
        InteractionManager.runAfterInteractions(() => {
          if (!isMountedRef.current) return;

          const hasGeminiKey = !!loadedSettings?.geminiApiKey;
          const hasElevenLabsKey = !!loadedSettings?.elevenLabsApiKey;

          void ensureAnalyticsId().then((analyticsId) => {
            if (!isMountedRef.current) return;

            identifyUser(analyticsId, {
              language: effectiveSettings.language,
              currency_code: effectiveSettings.currency.code,
              theme: effectiveSettings.theme,
            });

            setSuperProperties({
              language: effectiveSettings.language,
              currency_code: effectiveSettings.currency.code,
              theme: effectiveSettings.theme,
              smart_suggestions_enabled: smartSuggestionsEnabled,
            });

            trackEvent(AnalyticsEvents.APP_DATA_LOADED, {
              expense_count: loadedExpenses.length,
              grocery_count: loadedGrocery.length,
              template_count: loadedTemplates.length,
              smart_suggestions_enabled: smartSuggestionsEnabled,
              language: effectiveSettings.language,
              currency_code: effectiveSettings.currency.code,
              theme: effectiveSettings.theme,
              has_gemini_key: hasGeminiKey,
              has_elevenlabs_key: hasElevenLabsKey,
            });
          });
        });
      } catch (error) {
        console.error("Failed to load app data:", error);
        captureError(error, { context: "load_app_data" });

        if (!isMountedRef.current) {
          return;
        }

        setExpenses([]);
        setGroceryItems([]);
        setSettings(DEFAULT_SETTINGS);
        setTemplates([]);
        groceryItemsRef.current = [];
        settingsRef.current = DEFAULT_SETTINGS;
      } finally {
        // Always hide splash screen, even on error
        onReady?.();
      }
    };

    void loadData();
  }, []);

  const persistSettings = useCallback((nextSettings: UserSettings): void => {
    void Promise.resolve(saveSettings(nextSettings)).catch((error) => {
      handlePersistenceFailure(error, "save_settings");
    });
  }, [handlePersistenceFailure]);

  const recordExpenseAdded = useCallback((expense: Expense): void => {
    trackEvent(AnalyticsEvents.EXPENSE_ADDED, {
      expense_id: expense.id,
      category: expense.category,
      currency: expense.currency,
      has_image: !!expense.imageUri,
      has_description: !!expense.description,
      ai_detected: !!expense.aiDetected,
    });
  }, []);

  const addExpenseRecord = useCallback((expense: Expense): string => {
    setExpenses((prev) => [expense, ...prev]);
    void Promise.resolve(upsertExpense(expense)).catch((error) => {
      handlePersistenceFailure(error, "upsert_expense");
    });
    recordExpenseAdded(expense);
    return expense.id;
  }, [handlePersistenceFailure, recordExpenseAdded]);

  // Expense functions
  const addExpense = useCallback((expense: Omit<Expense, "id">): string => {
    const newExpense: Expense = {
      ...expense,
      id: createEntityId(),
    };

    return addExpenseRecord(newExpense);
  }, [addExpenseRecord, createEntityId]);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    const updatedFields = Object.keys(updates);
    if (updatedFields.length === 0) {
      return;
    }

    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id ? { ...expense, ...updates } : expense,
      ),
    );

    void Promise.resolve(updateExpenseById(id, updates)).catch((error) => {
      handlePersistenceFailure(error, "update_expense");
    });

    trackEvent(AnalyticsEvents.EXPENSE_UPDATED, {
      expense_id: id,
      updated_fields: updatedFields,
    });
  }, [handlePersistenceFailure]);

  const deleteExpense = useCallback(async (id: string) => {
    let deletedExpense: Expense | undefined;

    setExpenses((prev) => {
      deletedExpense = prev.find((expense) => expense.id === id);
      return prev.filter((expense) => expense.id !== id);
    });

    try {
      await deleteExpenseById(id);
      trackEvent(AnalyticsEvents.EXPENSE_DELETED, { expense_id: id });
    } catch (error) {
      const restoredExpense = deletedExpense;
      if (restoredExpense) {
        setExpenses((prev) => {
          if (prev.some((expense) => expense.id === restoredExpense.id)) {
            return prev;
          }
          return [restoredExpense, ...prev].sort(
            (a, b) => b.date.getTime() - a.date.getTime(),
          );
        });
      }
      handlePersistenceFailure(error, "delete_expense");
      throw error;
    }
  }, [handlePersistenceFailure]);

  const buildExpenseFromGrocery = useCallback((
    item: Pick<
      GroceryItem,
      "name" | "quantity" | "category" | "expenseCategory" | "imageUri"
    >,
    amount: number,
    imageUri?: string,
  ): Expense => {
    return {
      id: createEntityId(),
      amount,
      category: resolveExpenseCategoryForGroceryItem(item),
      date: new Date(),
      description: `${item.name}${item.quantity ? ` (${item.quantity})` : ""}`,
      currency: settingsRef.current.currency.code,
      imageUri: imageUri ?? item.imageUri,
    };
  }, [createEntityId, resolveExpenseCategoryForGroceryItem]);

  // Grocery functions
  const addGroceryItem = useCallback((
    item: Omit<GroceryItem, "id" | "nameNormalized" | "createdAt">,
  ) => {
    const nameNormalized = normalizeProductName(item.name);
    const fallbackExpenseCategory = getFallbackExpenseCategory(item.category);
    const newItem: GroceryItem = {
      ...item,
      nameNormalized,
      createdAt: new Date(),
      expenseCategory: item.expenseCategory ?? fallbackExpenseCategory,
      id: createEntityId(),
    };

    setGroceryItems((prev) => [newItem, ...prev]);

    void Promise.resolve(upsertGroceryItem(newItem)).catch((error) => {
      handlePersistenceFailure(error, "upsert_grocery_item");
    });

    cacheExpenseCategoryForGroceryItem(newItem);

    void ensureAnalyticsId()
      .then((analyticsId) => TemplateLearner.trackGroceryItem(newItem, analyticsId))
      .catch((error) => {
        captureError(error, { context: "track_grocery_item" });
      });

    trackEvent(AnalyticsEvents.GROCERY_ITEM_ADDED, {
      item_id: newItem.id,
      category: newItem.category,
      has_price: newItem.price !== null,
      has_template: !!newItem.templateId,
      ai_detected: !!newItem.aiDetected,
    });
  }, [
    cacheExpenseCategoryForGroceryItem,
    createEntityId,
    ensureAnalyticsId,
    getFallbackExpenseCategory,
    handlePersistenceFailure,
  ]);

  const updateGroceryItem = useCallback((id: string, updates: Partial<GroceryItem>) => {
    const currentItem = groceryItemsRef.current.find((item) => item.id === id);
    if (!currentItem) {
      return;
    }

    const normalizedName =
      updates.name !== undefined && updates.nameNormalized === undefined
        ? normalizeProductName(updates.name)
        : updates.nameNormalized;

    const sanitizedUpdates: Partial<GroceryItem> = {
      ...updates,
      ...(normalizedName !== undefined ? { nameNormalized: normalizedName } : {}),
    };

    const updatedItem: GroceryItem = {
      ...currentItem,
      ...sanitizedUpdates,
    };

    setGroceryItems((prev) =>
      prev.map((item) => (item.id === id ? updatedItem : item)),
    );

    void Promise.resolve(updateGroceryItemById(id, sanitizedUpdates)).catch((error) => {
      handlePersistenceFailure(error, "update_grocery_item");
    });

    trackEvent(AnalyticsEvents.GROCERY_ITEM_UPDATED, {
      item_id: id,
      updated_fields: Object.keys(sanitizedUpdates),
    });

    if (currentItem.expenseId) {
      const expenseUpdates: Partial<Expense> = {};

      if (
        sanitizedUpdates.price !== undefined &&
        sanitizedUpdates.price !== null &&
        sanitizedUpdates.price !== currentItem.price
      ) {
        expenseUpdates.amount = sanitizedUpdates.price;
      }

      if (
        sanitizedUpdates.name !== undefined ||
        sanitizedUpdates.quantity !== undefined
      ) {
        const newName = sanitizedUpdates.name ?? currentItem.name;
        const newQuantity = sanitizedUpdates.quantity ?? currentItem.quantity;
        expenseUpdates.description = `${newName}${newQuantity ? ` (${newQuantity})` : ""}`;
      }

      if (Object.keys(expenseUpdates).length > 0) {
        updateExpense(currentItem.expenseId, expenseUpdates);
      }
    }
  }, [handlePersistenceFailure, updateExpense]);

  const deleteGroceryItem = useCallback((id: string) => {
    const exists = groceryItemsRef.current.some((item) => item.id === id);
    if (!exists) {
      return;
    }

    setGroceryItems((prev) => prev.filter((item) => item.id !== id));

    if (itemPendingCompletion?.id === id) {
      setItemPendingCompletion(null);
    }

    void Promise.resolve(deleteGroceryItemById(id)).catch((error) => {
      handlePersistenceFailure(error, "delete_grocery_item");
    });

    trackEvent(AnalyticsEvents.GROCERY_ITEM_DELETED, { item_id: id });
  }, [handlePersistenceFailure, itemPendingCompletion]);

  const toggleGroceryItem = useCallback((id: string) => {
    const currentItem = groceryItemsRef.current.find((item) => item.id === id);
    if (!currentItem) {
      return;
    }

    const nextCheckedState = !currentItem.checked;

    if (nextCheckedState && !hasValidGroceryPrice(currentItem.price)) {
      trackEvent(AnalyticsEvents.GROCERY_ITEM_TOGGLED, {
        item_id: id,
        to_checked: true,
        result: "requires_price",
        has_price: false,
        has_template: !!currentItem.templateId,
        category: currentItem.category,
        ai_detected: !!currentItem.aiDetected,
      });
      setItemPendingCompletion(currentItem);
      return;
    }

    let expenseToCreate: Expense | null = null;
    let expenseIdToDelete: string | null = null;
    let groceryPatch: Partial<GroceryItem>;

    if (nextCheckedState && hasValidGroceryPrice(currentItem.price)) {
      const nextExpense = buildExpenseFromGrocery(currentItem, currentItem.price);
      const checkedAt = new Date();
      expenseToCreate = nextExpense;
      groceryPatch = {
        checked: true,
        expenseId: nextExpense.id,
        checkedAt,
      };
    } else if (!nextCheckedState && currentItem.expenseId) {
      expenseIdToDelete = currentItem.expenseId;
      groceryPatch = {
        checked: false,
        expenseId: undefined,
        checkedAt: undefined,
      };
    } else {
      groceryPatch = { checked: nextCheckedState };
    }

    setGroceryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...groceryPatch } : item)),
    );

    if (expenseToCreate) {
      addExpenseRecord(expenseToCreate);
    }

    void Promise.resolve(updateGroceryItemById(id, groceryPatch)).catch((error) => {
      handlePersistenceFailure(error, "toggle_grocery_item");
    });

    trackEvent(AnalyticsEvents.GROCERY_ITEM_TOGGLED, {
      item_id: id,
      to_checked: nextCheckedState,
      has_price: hasValidGroceryPrice(currentItem.price),
      created_expense: !!expenseToCreate,
      removed_expense: !!expenseIdToDelete,
      has_template: !!currentItem.templateId,
      category: currentItem.category,
      ai_detected: !!currentItem.aiDetected,
    });

    if (expenseIdToDelete) {
      deleteExpense(expenseIdToDelete);
    }
  }, [
    addExpenseRecord,
    buildExpenseFromGrocery,
    deleteExpense,
    handlePersistenceFailure,
    hasValidGroceryPrice,
  ]);

  const clearCompletedGroceryItems = useCallback(() => {
    const completedIds = groceryItemsRef.current
      .filter((item) => item.checked)
      .map((item) => item.id);

    if (completedIds.length === 0) {
      return;
    }

    setGroceryItems((prev) => prev.filter((item) => !item.checked));

    void Promise.resolve(deleteGroceryItemsByIds(completedIds)).catch((error) => {
      handlePersistenceFailure(error, "clear_completed_grocery_items");
    });

    trackEvent(AnalyticsEvents.GROCERY_LIST_CLEARED, {
      cleared_count: completedIds.length,
    });
  }, [handlePersistenceFailure]);

  const completeGroceryItem = useCallback((
    id: string,
    price: number,
    imageUri?: string,
  ) => {
    if (!Number.isFinite(price) || price <= 0) {
      return;
    }

    const currentItem = groceryItemsRef.current.find((item) => item.id === id);
    if (!currentItem) {
      return;
    }

    const nextExpense = buildExpenseFromGrocery(currentItem, price, imageUri);
    const checkedAt = new Date();
    const groceryPatch: Partial<GroceryItem> = {
      price,
      imageUri,
      checked: true,
      expenseId: nextExpense.id,
      checkedAt,
    };

    setGroceryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...groceryPatch } : item)),
    );

    addExpenseRecord(nextExpense);

    void Promise.resolve(updateGroceryItemById(id, groceryPatch)).catch((error) => {
      handlePersistenceFailure(error, "complete_grocery_item");
    });

    trackEvent(AnalyticsEvents.GROCERY_ITEM_COMPLETED, {
      item_id: id,
      has_image: !!imageUri,
    });

    setItemPendingCompletion(null);
  }, [addExpenseRecord, buildExpenseFromGrocery, handlePersistenceFailure]);

  // Settings functions
  const updateCurrency = useCallback((currency: Currency) => {
    const previousSettings = settingsRef.current;
    const nextSettings: UserSettings = { ...previousSettings, currency };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);

    persistSettings(nextSettings);

    trackEvent(AnalyticsEvents.CURRENCY_CHANGED, {
      setting_name: "currency",
      old_value: previousSettings.currency.code,
      new_value: currency.code,
    });

    setSuperProperties({
      currency_code: currency.code,
    });
  }, [persistSettings]);

  const updateTheme = useCallback((theme: "light" | "dark" | "system") => {
    const previousSettings = settingsRef.current;
    const nextSettings: UserSettings = { ...previousSettings, theme };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);

    persistSettings(nextSettings);

    trackEvent(AnalyticsEvents.THEME_CHANGED, {
      setting_name: "theme",
      old_value: previousSettings.theme,
      new_value: theme,
    });

    setSuperProperties({
      theme,
    });
  }, [persistSettings]);

  const updateLanguage = useCallback((language: string) => {
    const previousSettings = settingsRef.current;
    const nextSettings: UserSettings = { ...previousSettings, language };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);

    persistSettings(nextSettings);

    trackEvent(AnalyticsEvents.LANGUAGE_CHANGED, {
      setting_name: "language",
      old_value: previousSettings.language,
      new_value: language,
    });

    setSuperProperties({
      language,
    });
  }, [persistSettings]);

  const updateApiKey = useCallback((apiKey: string) => {
    const action = apiKey.trim().length > 0 ? "set" : "remove";

    const nextSettings: UserSettings = {
      ...settingsRef.current,
      geminiApiKey: apiKey,
    };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);

    persistSettings(nextSettings);
    setGeminiApiKey(apiKey);

    trackEvent(AnalyticsEvents.API_KEY_UPDATED, {
      key_type: "gemini",
      action,
    });

    setSuperProperties({
      has_gemini_key: action === "set",
    });
  }, [persistSettings]);

  const updateElevenLabsApiKey = useCallback((apiKey: string) => {
    const action = apiKey.trim().length > 0 ? "set" : "remove";

    const nextSettings: UserSettings = {
      ...settingsRef.current,
      elevenLabsApiKey: apiKey,
    };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);

    persistSettings(nextSettings);
    setElevenLabsApiKey(apiKey);

    trackEvent(AnalyticsEvents.API_KEY_UPDATED, {
      key_type: "elevenlabs",
      action,
    });

    setSuperProperties({
      has_elevenlabs_key: action === "set",
    });
  }, [persistSettings]);

  // Template functions
  const addTemplate = useCallback(async (
    template: Omit<
      GroceryTemplate,
      "id" | "createdAt" | "lastUsedAt" | "usageCount"
    >,
  ): Promise<GroceryTemplate> => {
    const newTemplate = await TemplateStorage.create(template);
    setTemplates((prev) => [...prev, newTemplate]);

    trackEvent(AnalyticsEvents.TEMPLATE_CREATED, {
      template_id: newTemplate.id,
      category: newTemplate.category,
      source: newTemplate.source,
      has_default_price: Number(newTemplate.defaultPrice) > 0,
      has_default_quantity: !!newTemplate.defaultQuantity,
    });

    return newTemplate;
  }, []);

  const updateTemplate = useCallback(async (
    id: string,
    updates: Partial<GroceryTemplate>,
  ): Promise<void> => {
    await TemplateStorage.update(id, updates);
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );

    trackEvent(AnalyticsEvents.TEMPLATE_UPDATED, {
      template_id: id,
      updated_fields: Object.keys(updates),
    });
  }, []);

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    await TemplateStorage.delete(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));

    trackEvent(AnalyticsEvents.TEMPLATE_DELETED, {
      template_id: id,
    });
  }, []);

  const findMatchingTemplates = useCallback(async (
    input: string,
  ): Promise<TemplateMatch[]> => {
    const normalized = normalizeProductName(input);
    return await TemplateStorage.findMatching(normalized);
  }, []);

  const applyTemplate = useCallback(async (
    templateId: string,
  ): Promise<Partial<GroceryItem> | null> => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return null;

    // Increment usage
    await TemplateStorage.incrementUsage(templateId);
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? { ...t, usageCount: t.usageCount + 1, lastUsedAt: new Date() }
          : t,
      ),
    );

    trackEvent(AnalyticsEvents.TEMPLATE_APPLIED, {
      template_id: templateId,
      category: template.category,
      source: template.source,
    });

    return {
      name: template.productNameDisplay,
      nameNormalized: template.productNameNormalized,
      quantity: template.defaultQuantity,
      price: template.defaultPrice,
      category: template.category,
      templateId: template.id,
    };
  }, [templates]);

  // Learning functions
  const checkForSuggestions = useCallback(async (): Promise<LearningCandidate | null> => {
    if (!smartSuggestionsEnabled) return null;
    return await TemplateLearner.detectLearningCandidates(groceryItems);
  }, [groceryItems, smartSuggestionsEnabled]);

  const acceptSuggestion = useCallback(async (
    candidate: LearningCandidate,
  ): Promise<GroceryTemplate> => {
    const newTemplate = await addTemplate({
      userId: "default",
      productNameDisplay: candidate.productName,
      productNameNormalized: candidate.productNameNormalized,
      defaultQuantity: candidate.defaultQuantity,
      defaultPrice: candidate.defaultPrice,
      category: candidate.category,
      source: "learned",
    });

    // Record that suggestion was accepted
    await TemplateLearner.recordSuggestion(candidate.productNameNormalized);

    return newTemplate;
  }, [addTemplate]);

  const dismissSuggestion = useCallback(async (
    normalizedName: string,
    forever: boolean,
  ): Promise<void> => {
    if (forever) {
      await TemplateLearner.dismissForever(normalizedName);
    } else {
      // Just record that we showed it (24h cooldown)
      await TemplateLearner.recordSuggestion(normalizedName);
    }
  }, []);

  const toggleSmartSuggestions = useCallback(() => {
    setSmartSuggestionsEnabled((prev) => {
      const next = !prev;
      trackEvent(AnalyticsEvents.SETTING_CHANGED, {
        setting_name: "smart_suggestions",
        new_value: next,
      });
      setSuperProperties({
        smart_suggestions_enabled: next,
      });
      return next;
    });
  }, []);

  const clearAllData = useCallback(async (): Promise<void> => {
    try {
      await clearStorageData();

      if (typeof LearningStorage.clear === "function") {
        await LearningStorage.clear();
      }

      // Only update state after successful storage clearing
      setExpenses([]);
      setGroceryItems([]);
      setSettings(DEFAULT_SETTINGS);
      setTemplates([]);
      setSmartSuggestionsEnabled(true);
      useExpenseStore.getState()._setExpenses([]);
      useGroceryStore.getState()._setGroceryItems([]);
      useTemplateStore.getState()._setTemplates([]);
      useSettingsStore.getState()._setSettings(DEFAULT_SETTINGS);
      groceryItemsRef.current = [];
      settingsRef.current = DEFAULT_SETTINGS;
      setGeminiApiKey("");
      setElevenLabsApiKey("");

      // Track data cleared after successful operation
      trackEvent(AnalyticsEvents.DATA_CLEARED, {
        action: "clear_all_data",
      });

      await resetAnalytics();

      const analyticsId = await ensureAnalyticsId();
      identifyUser(analyticsId, {
        language: DEFAULT_SETTINGS.language,
        currency_code: DEFAULT_SETTINGS.currency.code,
        theme: DEFAULT_SETTINGS.theme,
      });
      setSuperProperties({
        language: DEFAULT_SETTINGS.language,
        currency_code: DEFAULT_SETTINGS.currency.code,
        theme: DEFAULT_SETTINGS.theme,
        smart_suggestions_enabled: true,
      });
    } catch (error) {
      // Don't mutate state on failure - log and capture error
      console.error("Failed to clear data:", error);
      captureError(error, { context: "clear_all_data" });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }, []);

  // Computed values
  const {
    totalExpenses,
    todaysExpensesList,
    todayExpenses,
    monthExpenses,
    weekExpenses,
    categoryBreakdown,
  } = useMemo(() => {
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const breakdown: Record<ExpenseCategory, { amount: number; count: number }> =
      {} as Record<ExpenseCategory, { amount: number; count: number }>;
    const todaysList: Expense[] = [];
    let total = 0;
    let todayTotal = 0;
    let monthTotal = 0;
    let weekTotal = 0;

    for (const expense of expenses) {
      const amount = expense.amount;
      const expenseDate = expense.date;
      const expenseDay = expenseDate.getDate();
      const expenseMonth = expenseDate.getMonth();
      const expenseYear = expenseDate.getFullYear();

      total += amount;

      if (
        expenseDay === todayDate &&
        expenseMonth === todayMonth &&
        expenseYear === todayYear
      ) {
        todaysList.push(expense);
        todayTotal += amount;
      }

      if (expenseMonth === todayMonth && expenseYear === todayYear) {
        monthTotal += amount;
      }

      if (expenseDate >= weekStart && expenseDate < weekEnd) {
        weekTotal += amount;
      }

      const entry = breakdown[expense.category];
      if (entry) {
        entry.amount += amount;
        entry.count += 1;
      } else {
        breakdown[expense.category] = { amount, count: 1 };
      }
    }

    const categorySummary = Object.entries(breakdown)
      .map(([category, { amount, count }]) => ({
        category: category as ExpenseCategory,
        amount,
        count,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalExpenses: total,
      todaysExpensesList: todaysList,
      todayExpenses: todayTotal,
      monthExpenses: monthTotal,
      weekExpenses: weekTotal,
      categoryBreakdown: categorySummary,
    };
  }, [expenses]);

  // Translation
  const t = getTranslation(settings.language);

  // Helper for components
  const formatNumber = useCallback(
    (value: number | string) => {
      return formatNumberUtil(value, settings.language);
    },
    [settings.language],
  );

  // Color scheme
  const colorScheme =
    settings.theme === "system"
      ? (nativeColorScheme ?? "light")
      : settings.theme;

  const themeSliceValue = useMemo<ThemeSliceContextType>(
    () => ({ colorScheme }),
    [colorScheme],
  );

  const i18nSliceValue = useMemo<I18nSliceContextType>(
    () => ({ t, formatNumber }),
    [formatNumber, t],
  );

  const expenseSliceValue = useMemo<ExpenseSliceContextType>(
    () => ({
      expenses,
      addExpense,
      updateExpense,
      deleteExpense,
      totalExpenses,
      todayExpenses,
      monthExpenses,
      weekExpenses,
      todaysExpensesList,
      categoryBreakdown,
    }),
    [
      addExpense,
      categoryBreakdown,
      deleteExpense,
      expenses,
      monthExpenses,
      todayExpenses,
      todaysExpensesList,
      totalExpenses,
      updateExpense,
      weekExpenses,
    ],
  );

  const grocerySliceValue = useMemo<GrocerySliceContextType>(
    () => ({
      groceryItems,
      addGroceryItem,
      updateGroceryItem,
      deleteGroceryItem,
      toggleGroceryItem,
      clearCompletedGroceryItems,
      itemPendingCompletion,
      setItemPendingCompletion,
      completeGroceryItem,
    }),
    [
      addGroceryItem,
      clearCompletedGroceryItems,
      completeGroceryItem,
      deleteGroceryItem,
      groceryItems,
      itemPendingCompletion,
      toggleGroceryItem,
      updateGroceryItem,
    ],
  );

  const settingsSliceValue = useMemo<SettingsSliceContextType>(
    () => ({
      settings,
      updateCurrency,
      updateTheme,
      updateLanguage,
      updateApiKey,
      updateElevenLabsApiKey,
      clearAllData,
    }),
    [
      clearAllData,
      settings,
      updateApiKey,
      updateCurrency,
      updateElevenLabsApiKey,
      updateLanguage,
      updateTheme,
    ],
  );

  const templateSliceValue = useMemo<TemplateSliceContextType>(
    () => ({
      templates,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      findMatchingTemplates,
      applyTemplate,
    }),
    [
      addTemplate,
      applyTemplate,
      deleteTemplate,
      findMatchingTemplates,
      templates,
      updateTemplate,
    ],
  );

  const learningSliceValue = useMemo<LearningSliceContextType>(
    () => ({
      checkForSuggestions,
      acceptSuggestion,
      dismissSuggestion,
      smartSuggestionsEnabled,
      toggleSmartSuggestions,
    }),
    [
      acceptSuggestion,
      checkForSuggestions,
      dismissSuggestion,
      smartSuggestionsEnabled,
      toggleSmartSuggestions,
    ],
  );

  const value = useMemo<AppContextType>(
    () => ({
      ...expenseSliceValue,
      ...grocerySliceValue,
      ...settingsSliceValue,
      t,
      formatNumber,
      colorScheme,
      ...templateSliceValue,
      ...learningSliceValue,
    }),
    [
      colorScheme,
      expenseSliceValue,
      formatNumber,
      grocerySliceValue,
      learningSliceValue,
      settingsSliceValue,
      t,
      templateSliceValue,
    ],
  );

  return (
    <ThemeSliceContext.Provider value={themeSliceValue}>
      <I18nSliceContext.Provider value={i18nSliceValue}>
        <ExpenseSliceContext.Provider value={expenseSliceValue}>
          <GrocerySliceContext.Provider value={grocerySliceValue}>
            <SettingsSliceContext.Provider value={settingsSliceValue}>
              <TemplateSliceContext.Provider value={templateSliceValue}>
                <LearningSliceContext.Provider value={learningSliceValue}>
                  <AppContext.Provider value={value}>{children}</AppContext.Provider>
                </LearningSliceContext.Provider>
              </TemplateSliceContext.Provider>
            </SettingsSliceContext.Provider>
          </GrocerySliceContext.Provider>
        </ExpenseSliceContext.Provider>
      </I18nSliceContext.Provider>
    </ThemeSliceContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

export const useThemeSlice = (): ThemeSliceContextType => {
  const context = useContext(ThemeSliceContext);
  if (context === undefined) {
    throw new Error("useThemeSlice must be used within an AppProvider");
  }
  return context;
};

export const useI18nSlice = (): I18nSliceContextType => {
  const context = useContext(I18nSliceContext);
  if (context === undefined) {
    throw new Error("useI18nSlice must be used within an AppProvider");
  }
  return context;
};

export const useExpenseSlice = (): ExpenseSliceContextType => {
  const context = useContext(ExpenseSliceContext);
  if (context === undefined) {
    throw new Error("useExpenseSlice must be used within an AppProvider");
  }
  return context;
};

export const useGrocerySlice = (): GrocerySliceContextType => {
  const context = useContext(GrocerySliceContext);
  if (context === undefined) {
    throw new Error("useGrocerySlice must be used within an AppProvider");
  }
  return context;
};

export const useSettingsSlice = (): SettingsSliceContextType => {
  const context = useContext(SettingsSliceContext);
  if (context === undefined) {
    throw new Error("useSettingsSlice must be used within an AppProvider");
  }
  return context;
};

export const useTemplateSlice = (): TemplateSliceContextType => {
  const context = useContext(TemplateSliceContext);
  if (context === undefined) {
    throw new Error("useTemplateSlice must be used within an AppProvider");
  }
  return context;
};

export const useLearningSlice = (): LearningSliceContextType => {
  const context = useContext(LearningSliceContext);
  if (context === undefined) {
    throw new Error("useLearningSlice must be used within an AppProvider");
  }
  return context;
};
