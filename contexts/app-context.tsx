import { TemplateLearner } from "@/features/templates/services/template-learner";
import { TemplateStorage } from "@/features/templates/services/template-storage";
import { normalizeProductName } from "@/features/templates/services/template-utils";
import { setElevenLabsApiKey } from "@/services/ai/elevenlabs";
import { detectExpenseCategory, setGeminiApiKey } from "@/services/ai/gemini";
import { trackEvent, captureError, AnalyticsEvents } from "@/services/analytics";
import { getTranslation, TranslationKey } from "@/services/i18n";
import {
  loadExpenses,
  loadGroceryItems,
  loadSettings,
  saveExpenses,
  saveGroceryItems,
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
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme as useNativeColorScheme } from "react-native";

interface AppContextType {
  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => string;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

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

const DEFAULT_SETTINGS: UserSettings = {
  currency: CURRENCIES[0], // USD
  theme: "system",
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

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const nativeColorScheme = useNativeColorScheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [templates, setTemplates] = useState<GroceryTemplate[]>([]);
  const [smartSuggestionsEnabled, setSmartSuggestionsEnabled] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [itemPendingCompletion, setItemPendingCompletion] =
    useState<GroceryItem | null>(null);

  const getFallbackExpenseCategory = (
    groceryCategory: GroceryItem["category"],
  ): ExpenseCategory => {
    return FALLBACK_GROCERY_TO_EXPENSE_CATEGORY[groceryCategory] ?? "other";
  };

  const resolveExpenseCategoryForGroceryItem = (
    item: Pick<GroceryItem, "expenseCategory" | "category">,
  ): ExpenseCategory => {
    return item.expenseCategory ?? getFallbackExpenseCategory(item.category);
  };

  const cacheExpenseCategoryForGroceryItem = (item: GroceryItem): void => {
    const fallbackCategory = getFallbackExpenseCategory(item.category);

    Promise.resolve(detectExpenseCategory(item.name))
      .then((detectedCategory) => {
        if (!detectedCategory) return;
        setGroceryItems((prev) =>
          prev.map((entry) =>
            entry.id === item.id &&
            (!entry.expenseCategory || entry.expenseCategory === fallbackCategory)
              ? {
                  ...entry,
                  expenseCategory: detectedCategory,
                }
              : entry,
          ),
        );
      })
      .catch((error) => {
        console.error("Failed to detect expense category for grocery item:", error);
      });
  };

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

        setExpenses(loadedExpenses);
        setGroceryItems(loadedGrocery);
        setSettings(loadedSettings || DEFAULT_SETTINGS);
        setTemplates(loadedTemplates);

        if (loadedSettings?.geminiApiKey) {
          setGeminiApiKey(loadedSettings.geminiApiKey);
        }

        if (loadedSettings?.elevenLabsApiKey) {
          setElevenLabsApiKey(loadedSettings.elevenLabsApiKey);
        }
      } catch (error) {
        console.error("Failed to load app data:", error);
        captureError(error, { context: "load_app_data" });
        setExpenses([]);
        setGroceryItems([]);
        setSettings(DEFAULT_SETTINGS);
        setTemplates([]);
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  // Save expenses whenever they change
  useEffect(() => {
    if (isLoaded) {
      Promise.resolve(saveExpenses(expenses)).catch((error) => {
        console.error("Failed to save expenses:", error);
        captureError(error, { context: "save_expenses" });
      });
    }
  }, [expenses, isLoaded]);

  // Save grocery items whenever they change
  useEffect(() => {
    if (isLoaded) {
      saveGroceryItems(groceryItems);
    }
  }, [groceryItems, isLoaded]);

  // Save settings whenever they change
  useEffect(() => {
    if (isLoaded) {
      saveSettings(settings);
    }
  }, [settings, isLoaded]);

  // Expense functions
  const addExpense = (expense: Omit<Expense, "id">): string => {
    const newExpense: Expense = {
      ...expense,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setExpenses((prev) => [newExpense, ...prev]);

    // Track expense added
    trackEvent(AnalyticsEvents.EXPENSE_ADDED, {
      expense_id: newExpense.id,
      amount: newExpense.amount,
      category: newExpense.category,
      currency: newExpense.currency,
      has_image: !!newExpense.imageUri,
      ai_detected: !!newExpense.aiDetected,
    });

    return newExpense.id;
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id ? { ...expense, ...updates } : expense,
      ),
    );
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));

    // Track expense deleted
    trackEvent(AnalyticsEvents.EXPENSE_DELETED, { expense_id: id });
  };

  // Grocery functions
  const addGroceryItem = (
    item: Omit<GroceryItem, "id" | "nameNormalized" | "createdAt">,
  ) => {
    const nameNormalized = normalizeProductName(item.name);
    const fallbackExpenseCategory = getFallbackExpenseCategory(item.category);
    const newItem: GroceryItem = {
      ...item,
      nameNormalized,
      createdAt: new Date(),
      expenseCategory: item.expenseCategory ?? fallbackExpenseCategory,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setGroceryItems((prev) => [newItem, ...prev]);
    cacheExpenseCategoryForGroceryItem(newItem);

    // Track for learning (async, don't await)
    TemplateLearner.trackGroceryItem(newItem);

    // Track grocery item added
    // Privacy: item_name intentionally omitted to avoid PII in analytics.
    // See AnalyticsEvents.GROCERY_ITEM_ADDED - only non-PII metadata is sent.
    trackEvent(AnalyticsEvents.GROCERY_ITEM_ADDED, {
      item_id: newItem.id,
      category: newItem.category,
      has_price: newItem.price !== null,
      has_template: !!newItem.templateId,
      ai_detected: !!newItem.aiDetected,
    });
  };

  const updateGroceryItem = (id: string, updates: Partial<GroceryItem>) => {
    setGroceryItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, ...updates };

          // If this is a checked item with a linked expense, sync changes
          if (item.expenseId) {
            const expenseUpdates: Partial<Expense> = {};

            // Sync price change
            if (
              updates.price !== undefined &&
              updates.price !== null &&
              updates.price !== item.price
            ) {
              expenseUpdates.amount = updates.price;
            }

            // Sync name/quantity change (rebuild description)
            if (updates.name !== undefined || updates.quantity !== undefined) {
              const newName = updates.name ?? item.name;
              const newQuantity = updates.quantity ?? item.quantity;
              expenseUpdates.description = `${newName}${newQuantity ? ` (${newQuantity})` : ""}`;
            }

            // Apply expense updates if any
            if (Object.keys(expenseUpdates).length > 0) {
              updateExpense(item.expenseId, expenseUpdates);
            }
          }

          return updatedItem;
        }
        return item;
      }),
    );
  };

  const deleteGroceryItem = (id: string) => {
    setGroceryItems((prev) => prev.filter((item) => item.id !== id));

    // Track grocery item deleted
    trackEvent(AnalyticsEvents.GROCERY_ITEM_DELETED, { item_id: id });
  };

  const toggleGroceryItem = (id: string) => {
    const item = groceryItems.find((i) => i.id === id);
    if (!item) return;

    // Intercept: If checking item without price, trigger completion modal
    if (!item.checked && item.price === null) {
      setItemPendingCompletion(item);
      return; // Don't toggle yet
    }

    // Normal toggle logic
    setGroceryItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newCheckedState = !item.checked;

          if (newCheckedState && item.price !== null) {
            // Checking: Add expense and store its ID
            const newExpense = {
              amount: item.price,
              category: resolveExpenseCategoryForGroceryItem(item),
              date: new Date(),
              description: `${item.name}${item.quantity ? ` (${item.quantity})` : ""}`,
              currency: settings.currency.code,
              imageUri: item.imageUri,
            };
            const expenseId = addExpense(newExpense);
            return {
              ...item,
              checked: newCheckedState,
              expenseId,
              checkedAt: new Date(),
            };
          } else if (!newCheckedState && item.expenseId) {
            // Unchecking: Remove the linked expense
            deleteExpense(item.expenseId);
            return { ...item, checked: newCheckedState, expenseId: undefined };
            // Keep price and imageUri when unchecking
          }

          return { ...item, checked: newCheckedState };
        }
        return item;
      }),
    );
  };

  const clearCompletedGroceryItems = () => {
    setGroceryItems((prev) => prev.filter((item) => !item.checked));
  };

  const completeGroceryItem = (
    id: string,
    price: number,
    imageUri?: string,
  ) => {
    setGroceryItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // Update price and image
          const updatedItem = { ...item, price, imageUri };

          // Create expense
          const newExpense = {
            amount: price,
            category: resolveExpenseCategoryForGroceryItem(item),
            date: new Date(),
            description: `${item.name}${item.quantity ? ` (${item.quantity})` : ""}`,
            currency: settings.currency.code,
            imageUri,
          };
          const expenseId = addExpense(newExpense);

          return {
            ...updatedItem,
            checked: true,
            expenseId,
            checkedAt: new Date(),
          };
        }
        return item;
      }),
    );

    // Track grocery item completed
    trackEvent(AnalyticsEvents.GROCERY_ITEM_COMPLETED, {
      item_id: id,
      price: price,
      has_image: !!imageUri,
    });

    setItemPendingCompletion(null);
  };

  // Settings functions
  const updateCurrency = (currency: Currency) => {
    const oldCurrency = settings.currency.code;
    setSettings((prev) => ({ ...prev, currency }));

    // Track currency change
    trackEvent(AnalyticsEvents.CURRENCY_CHANGED, {
      setting_name: "currency",
      old_value: oldCurrency,
      new_value: currency.code,
    });
  };

  const updateTheme = (theme: "light" | "dark" | "system") => {
    const oldTheme = settings.theme;
    setSettings((prev) => ({ ...prev, theme }));

    // Track theme change
    trackEvent(AnalyticsEvents.THEME_CHANGED, {
      setting_name: "theme",
      old_value: oldTheme,
      new_value: theme,
    });
  };

  const updateLanguage = (language: string) => {
    const oldLanguage = settings.language;
    const newSettings = { ...settings, language };
    setSettings(newSettings);

    // Track language change
    trackEvent(AnalyticsEvents.LANGUAGE_CHANGED, {
      setting_name: "language",
      old_value: oldLanguage,
      new_value: language,
    });
  };

  const updateApiKey = (apiKey: string) => {
    const newSettings = { ...settings, geminiApiKey: apiKey };
    setSettings(newSettings);
    setGeminiApiKey(apiKey);
  };

  const updateElevenLabsApiKey = (apiKey: string) => {
    const newSettings = { ...settings, elevenLabsApiKey: apiKey };
    setSettings(newSettings);
    setElevenLabsApiKey(apiKey);
  };

  // Template functions
  const addTemplate = async (
    template: Omit<
      GroceryTemplate,
      "id" | "createdAt" | "lastUsedAt" | "usageCount"
    >,
  ): Promise<GroceryTemplate> => {
    const newTemplate = await TemplateStorage.create(template);
    setTemplates((prev) => [...prev, newTemplate]);
    return newTemplate;
  };

  const updateTemplate = async (
    id: string,
    updates: Partial<GroceryTemplate>,
  ): Promise<void> => {
    await TemplateStorage.update(id, updates);
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
  };

  const deleteTemplate = async (id: string): Promise<void> => {
    await TemplateStorage.delete(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const findMatchingTemplates = async (
    input: string,
  ): Promise<TemplateMatch[]> => {
    const normalized = normalizeProductName(input);
    return await TemplateStorage.findMatching(normalized);
  };

  const applyTemplate = async (
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

    return {
      name: template.productNameDisplay,
      nameNormalized: template.productNameNormalized,
      quantity: template.defaultQuantity,
      price: template.defaultPrice,
      category: template.category,
      templateId: template.id,
    };
  };

  // Learning functions
  const checkForSuggestions = async (): Promise<LearningCandidate | null> => {
    if (!smartSuggestionsEnabled) return null;
    return await TemplateLearner.detectLearningCandidates(groceryItems);
  };

  const acceptSuggestion = async (
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
  };

  const dismissSuggestion = async (
    normalizedName: string,
    forever: boolean,
  ): Promise<void> => {
    if (forever) {
      await TemplateLearner.dismissForever(normalizedName);
    } else {
      // Just record that we showed it (24h cooldown)
      await TemplateLearner.recordSuggestion(normalizedName);
    }
  };

  const toggleSmartSuggestions = () => {
    setSmartSuggestionsEnabled((prev) => !prev);
  };

  const clearAllData = async (): Promise<void> => {
    try {
      // Clear template storage first - await before mutating state
      if (typeof TemplateStorage.clear === "function") {
        await TemplateStorage.clear();
      } else {
        const allTemplates = await TemplateStorage.getAll();
        await Promise.all(
          allTemplates.map((template) => TemplateStorage.delete(template.id)),
        );
      }

      // Only update state after successful storage clearing
      setExpenses([]);
      setGroceryItems([]);
      setTemplates([]);

      // Track data cleared after successful operation
      trackEvent(AnalyticsEvents.DATA_CLEARED, {
        action: "clear_all_data",
      });
    } catch (error) {
      // Don't mutate state on failure - log and capture error
      console.error("Failed to clear data:", error);
      captureError(error, { context: "clear_all_data" });
      throw error instanceof Error ? error : new Error(String(error));
    }
  };

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
  const formatNumber = (value: number | string) => {
    return formatNumberUtil(value, settings.language);
  };

  // Color scheme
  const colorScheme =
    settings.theme === "system"
      ? (nativeColorScheme ?? "light")
      : settings.theme;

  const value: AppContextType = {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    groceryItems,
    addGroceryItem,
    updateGroceryItem,
    deleteGroceryItem,
    toggleGroceryItem,
    clearCompletedGroceryItems,
    itemPendingCompletion,
    setItemPendingCompletion,
    completeGroceryItem,
    settings,
    updateCurrency,
    updateTheme,
    updateLanguage,
    updateApiKey,
    updateElevenLabsApiKey,
    totalExpenses,
    todayExpenses,
    monthExpenses,
    weekExpenses,
    todaysExpensesList,
    categoryBreakdown,
    t,
    formatNumber,
    colorScheme,
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    findMatchingTemplates,
    applyTemplate,
    checkForSuggestions,
    acceptSuggestion,
    dismissSuggestion,
    smartSuggestionsEnabled,
    toggleSmartSuggestions,
    clearAllData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
