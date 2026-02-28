import { create } from "zustand";
import {
  trackEvent,
  captureError,
  AnalyticsEvents,
} from "@/services/analytics";
import {
  upsertExpense,
  updateExpenseById,
  deleteExpenseById,
} from "@/services/storage";
import { Expense, ExpenseCategory } from "@/types";

function createEntityId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 11);
}

interface DerivedExpenseValues {
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

function computeDerived(expenses: Expense[]): DerivedExpenseValues {
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
}

interface ExpenseState extends DerivedExpenseValues {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => string;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => Promise<void>;
  /** Internal: used by AppProvider after DB load and by grocery-store for completeGroceryItem */
  _addExpenseRecord: (expense: Expense) => string;
  /** Internal: called by AppProvider after DB load */
  _setExpenses: (expenses: Expense[]) => void;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  totalExpenses: 0,
  todayExpenses: 0,
  monthExpenses: 0,
  weekExpenses: 0,
  todaysExpensesList: [],
  categoryBreakdown: [],

  _setExpenses: (expenses) => {
    set({ expenses, ...computeDerived(expenses) });
  },

  _addExpenseRecord: (expense) => {
    const next = [expense, ...get().expenses];
    set({ expenses: next, ...computeDerived(next) });
    void upsertExpense(expense).catch((e) =>
      console.error("Failed to upsert expense:", e),
    );
    trackEvent(AnalyticsEvents.EXPENSE_ADDED, {
      expense_id: expense.id,
      category: expense.category,
      currency: expense.currency,
      has_image: !!expense.imageUri,
      has_description: !!expense.description,
      ai_detected: !!expense.aiDetected,
    });
    return expense.id;
  },

  addExpense: (expense) => {
    const newExpense: Expense = { ...expense, id: createEntityId() };
    return get()._addExpenseRecord(newExpense);
  },

  updateExpense: (id, updates) => {
    const updatedFields = Object.keys(updates);
    if (updatedFields.length === 0) return;
    const next = get().expenses.map((e) =>
      e.id === id ? { ...e, ...updates } : e,
    );
    set({ expenses: next, ...computeDerived(next) });
    void updateExpenseById(id, updates).catch((e) =>
      console.error("Failed to update expense:", e),
    );
    trackEvent(AnalyticsEvents.EXPENSE_UPDATED, {
      expense_id: id,
      updated_fields: updatedFields,
    });
  },

  deleteExpense: async (id) => {
    const snapshot = get().expenses;
    const deletedExpense = snapshot.find((e) => e.id === id);
    const next = snapshot.filter((e) => e.id !== id);
    set({ expenses: next, ...computeDerived(next) });
    try {
      await deleteExpenseById(id);
      trackEvent(AnalyticsEvents.EXPENSE_DELETED, { expense_id: id });
    } catch (error) {
      if (deletedExpense) {
        const restored = [deletedExpense, ...get().expenses].sort(
          (a, b) => b.date.getTime() - a.date.getTime(),
        );
        set({ expenses: restored, ...computeDerived(restored) });
      }
      captureError(error, { context: "delete_expense" });
      throw error;
    }
  },
}));
