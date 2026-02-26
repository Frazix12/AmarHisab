import { create } from "zustand";
import { normalizeProductName } from "@/features/templates/services/template-utils";
import {
  trackEvent,
  captureError,
  AnalyticsEvents,
} from "@/services/analytics";
import {
  ensureAnalyticsId,
  upsertGroceryItem,
  updateGroceryItemById,
  deleteGroceryItemById,
  deleteGroceryItemsByIds,
} from "@/services/storage";
import { TemplateLearner } from "@/features/templates/services/template-learner";
import { Expense, ExpenseCategory, GroceryItem } from "@/types";
import { useExpenseStore } from "@/stores/expense-store";
import { useSettingsStore } from "@/stores/settings-store";

const FALLBACK_GROCERY_TO_EXPENSE_CATEGORY: Record<
  GroceryItem["category"],
  ExpenseCategory
> = {
  fruits: "food",
  vegetables: "food",
  dairy: "food",
  meat: "food",
  snacks: "food",
  beverages: "food",
  household: "shopping",
  other: "other",
};

function createEntityId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 11);
}

interface GroceryState {
  groceryItems: GroceryItem[];
  itemPendingCompletion: GroceryItem | null;
  addGroceryItem: (
    item: Omit<GroceryItem, "id" | "nameNormalized" | "createdAt">,
  ) => void;
  updateGroceryItem: (id: string, updates: Partial<GroceryItem>) => void;
  deleteGroceryItem: (id: string) => void;
  toggleGroceryItem: (id: string) => void;
  clearCompletedGroceryItems: () => void;
  setItemPendingCompletion: (item: GroceryItem | null) => void;
  completeGroceryItem: (id: string, price: number, imageUri?: string) => void;
  /** Internal: called by AppProvider after DB load */
  _setGroceryItems: (items: GroceryItem[]) => void;
}

export const useGroceryStore = create<GroceryState>((set, get) => {
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

  const hasValidGroceryPrice = (price: GroceryItem["price"]): price is number => {
    return typeof price === "number" && Number.isFinite(price) && price > 0;
  };

  const buildExpenseFromGrocery = (
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
      currency: useSettingsStore.getState().settings.currency.code,
      imageUri: imageUri ?? item.imageUri,
    };
  };

  const cacheExpenseCategoryForGroceryItem = (item: GroceryItem): void => {
    const fallbackCategory = getFallbackExpenseCategory(item.category);

    void import("@/services/ai/gemini")
      .then(({ detectExpenseCategory }) => detectExpenseCategory(item.name))
      .then((detectedCategory) => {
        if (!detectedCategory) return;

        let categoryApplied = false;
        set((state) => {
          const nextItems = state.groceryItems.map((entry) => {
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

          return { groceryItems: nextItems };
        });

        const currentEntry = get().groceryItems.find((entry) => entry.id === item.id);
        const shouldPersistCategory =
          categoryApplied && currentEntry?.expenseCategory === detectedCategory;

        if (shouldPersistCategory) {
          void updateGroceryItemById(item.id, {
            expenseCategory: detectedCategory,
          }).catch((error) => {
            console.error("Failed to persist update_grocery_expense_category:", error);
          });
        }

        trackEvent(AnalyticsEvents.AI_CATEGORY_DETECTED, {
          source: "grocery_item",
          detected_category: detectedCategory,
          fallback_category: fallbackCategory,
        });
      })
      .catch((error) => {
        console.error("Failed to detect expense category for grocery item:", error);
      });
  };

  return {
    groceryItems: [],
    itemPendingCompletion: null,

    _setGroceryItems: (items) => {
      set({ groceryItems: items });
    },

    addGroceryItem: (item) => {
      const nameNormalized = normalizeProductName(item.name);
      const fallbackExpenseCategory = getFallbackExpenseCategory(item.category);
      const newItem: GroceryItem = {
        ...item,
        nameNormalized,
        createdAt: new Date(),
        expenseCategory: item.expenseCategory ?? fallbackExpenseCategory,
        id: createEntityId(),
      };

      set((state) => ({ groceryItems: [newItem, ...state.groceryItems] }));

      void upsertGroceryItem(newItem).catch((error) => {
        console.error("Failed to persist upsert_grocery_item:", error);
        captureError(error, { context: "upsert_grocery_item" });
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
    },

    updateGroceryItem: (id, updates) => {
      const currentItem = get().groceryItems.find((item) => item.id === id);
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

      set((state) => ({
        groceryItems: state.groceryItems.map((item) =>
          item.id === id ? updatedItem : item,
        ),
      }));

      void updateGroceryItemById(id, sanitizedUpdates).catch((error) => {
        console.error("Failed to persist update_grocery_item:", error);
        captureError(error, { context: "update_grocery_item" });
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
          useExpenseStore.getState().updateExpense(currentItem.expenseId, expenseUpdates);
        }
      }
    },

    deleteGroceryItem: (id) => {
      const exists = get().groceryItems.some((item) => item.id === id);
      if (!exists) {
        return;
      }

      set((state) => ({
        groceryItems: state.groceryItems.filter((item) => item.id !== id),
      }));

      if (get().itemPendingCompletion?.id === id) {
        set({ itemPendingCompletion: null });
      }

      void deleteGroceryItemById(id).catch((error) => {
        console.error("Failed to persist delete_grocery_item:", error);
        captureError(error, { context: "delete_grocery_item" });
      });

      trackEvent(AnalyticsEvents.GROCERY_ITEM_DELETED, { item_id: id });
    },

    toggleGroceryItem: (id) => {
      const currentItem = get().groceryItems.find((item) => item.id === id);
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
        set({ itemPendingCompletion: currentItem });
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

      set((state) => ({
        groceryItems: state.groceryItems.map((item) =>
          item.id === id ? { ...item, ...groceryPatch } : item,
        ),
      }));

      if (expenseToCreate) {
        useExpenseStore.getState()._addExpenseRecord(expenseToCreate);
      }

      void updateGroceryItemById(id, groceryPatch).catch((error) => {
        console.error("Failed to persist toggle_grocery_item:", error);
        captureError(error, { context: "toggle_grocery_item" });
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
        void useExpenseStore.getState().deleteExpense(expenseIdToDelete);
      }
    },

    clearCompletedGroceryItems: () => {
      const completedIds = get().groceryItems
        .filter((item) => item.checked)
        .map((item) => item.id);

      if (completedIds.length === 0) {
        return;
      }

      set((state) => ({
        groceryItems: state.groceryItems.filter((item) => !item.checked),
      }));

      void deleteGroceryItemsByIds(completedIds).catch((error) => {
        console.error("Failed to persist clear_completed_grocery_items:", error);
        captureError(error, { context: "clear_completed_grocery_items" });
      });

      trackEvent(AnalyticsEvents.GROCERY_LIST_CLEARED, {
        cleared_count: completedIds.length,
      });
    },

    setItemPendingCompletion: (item) => {
      set({ itemPendingCompletion: item });
    },

    completeGroceryItem: (id, price, imageUri) => {
      if (!Number.isFinite(price) || price <= 0) {
        return;
      }

      const currentItem = get().groceryItems.find((item) => item.id === id);
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

      set((state) => ({
        groceryItems: state.groceryItems.map((item) =>
          item.id === id ? { ...item, ...groceryPatch } : item,
        ),
      }));

      useExpenseStore.getState()._addExpenseRecord(nextExpense);

      void updateGroceryItemById(id, groceryPatch).catch((error) => {
        console.error("Failed to persist complete_grocery_item:", error);
        captureError(error, { context: "complete_grocery_item" });
      });

      trackEvent(AnalyticsEvents.GROCERY_ITEM_COMPLETED, {
        item_id: id,
        has_image: !!imageUri,
      });

      set({ itemPendingCompletion: null });
    },
  };
});
