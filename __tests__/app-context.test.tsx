import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { AppProvider, useApp } from "@/contexts/app-context";
import { CURRENCIES, Expense, GroceryItem, UserSettings } from "@/types";
import { TemplateLearner } from "@/features/templates/services/template-learner";
import { TemplateStorage } from "@/features/templates/services/template-storage";
import {
  loadExpenses,
  loadGroceryItems,
  loadSettings,
} from "@/services/storage";
import { setElevenLabsApiKey } from "@/services/ai/elevenlabs";
import { setGeminiApiKey } from "@/services/ai/gemini";

jest.mock("@/services/storage", () => ({
  loadExpenses: jest.fn(),
  loadGroceryItems: jest.fn(),
  loadSettings: jest.fn(),
  saveExpenses: jest.fn(),
  saveGroceryItems: jest.fn(),
  saveSettings: jest.fn(),
}));

jest.mock("@/features/templates/services/template-storage", () => ({
  TemplateStorage: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    incrementUsage: jest.fn(),
    findMatching: jest.fn(),
  },
}));

jest.mock("@/features/templates/services/template-learner", () => ({
  TemplateLearner: {
    trackGroceryItem: jest.fn(),
    detectLearningCandidates: jest.fn(),
    recordSuggestion: jest.fn(),
    dismissForever: jest.fn(),
  },
}));

jest.mock("@/features/templates/services/learning-storage", () => ({
  LearningStorage: {
    clear: jest.fn(),
  },
}));

jest.mock("@/services/ai/gemini", () => ({
  setGeminiApiKey: jest.fn(),
}));

jest.mock("@/services/ai/elevenlabs", () => ({
  setElevenLabsApiKey: jest.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

const defaultSettings: UserSettings = {
  currency: CURRENCIES[0],
  theme: "system",
  language: "en",
};

describe("AppProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (TemplateStorage.getAll as jest.Mock).mockResolvedValue([]);
    (loadExpenses as jest.Mock).mockResolvedValue([]);
    (loadGroceryItems as jest.Mock).mockResolvedValue([]);
    (loadSettings as jest.Mock).mockResolvedValue(defaultSettings);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("loads stored data and computes totals", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 0, 15, 12));

    const expenses: Expense[] = [
      {
        id: "1",
        amount: 10,
        category: "food",
        date: new Date(2025, 0, 15, 8),
        description: "Breakfast",
        currency: "USD",
      },
      {
        id: "2",
        amount: 20,
        category: "transport",
        date: new Date(2024, 11, 20, 8),
        description: "Bus",
        currency: "USD",
      },
    ];

    (loadExpenses as jest.Mock).mockResolvedValue(expenses);

    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => expect(result.current.expenses).toHaveLength(2));

    expect(result.current.totalExpenses).toBe(30);
    expect(result.current.todayExpenses).toBe(10);
    expect(setGeminiApiKey).not.toHaveBeenCalled();
    expect(setElevenLabsApiKey).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it("adds expenses and updates totals", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 0, 15, 12));

    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.expenses).toHaveLength(0));

    act(() => {
      result.current.addExpense({
        amount: 5,
        category: "food",
        date: new Date(2025, 0, 15, 10),
        description: "Coffee",
        currency: "USD",
      });
    });

    await waitFor(() => expect(result.current.expenses).toHaveLength(1));
    expect(result.current.totalExpenses).toBe(5);

    jest.useRealTimers();
  });

  it("toggles grocery items with price into expenses", async () => {
    jest.useFakeTimers("modern" as any);
    jest.setSystemTime(new Date(2025, 0, 15, 12));

    const groceryItems: GroceryItem[] = [
      {
        id: "g1",
        name: "Milk",
        nameNormalized: "milk",
        quantity: "1L",
        price: 2,
        checked: false,
        category: "dairy",
        createdAt: new Date(2025, 0, 15, 9),
      },
    ];

    (loadGroceryItems as jest.Mock).mockResolvedValue(groceryItems);

    const { result } = renderHook(() => useApp(), { wrapper });

    await waitFor(() => expect(result.current.groceryItems).toHaveLength(1));

    act(() => {
      result.current.toggleGroceryItem("g1");
    });

    await waitFor(() =>
      expect(result.current.groceryItems[0].checked).toBe(true),
    );
    expect(result.current.expenses).toHaveLength(1);
    expect(result.current.expenses[0].amount).toBe(groceryItems[0].price);
    expect(result.current.groceryItems[0].expenseId).toBeTruthy();
    expect(TemplateLearner.trackGroceryItem).not.toHaveBeenCalled();
  });

  it("requires completion modal for zero-priced grocery items", async () => {
    const groceryItems: GroceryItem[] = [
      {
        id: "g1",
        name: "Voice Item",
        nameNormalized: "voice item",
        quantity: "1",
        price: 0,
        checked: false,
        category: "other",
        createdAt: new Date(2025, 0, 15, 9),
      },
    ];

    (loadGroceryItems as jest.Mock).mockResolvedValue(groceryItems);

    const { result } = renderHook(() => useApp(), { wrapper });
    await waitFor(() => expect(result.current.groceryItems).toHaveLength(1));

    act(() => {
      result.current.toggleGroceryItem("g1");
    });

    expect(result.current.itemPendingCompletion?.id).toBe("g1");
    expect(result.current.expenses).toHaveLength(0);
    expect(result.current.groceryItems[0].checked).toBe(false);
  });
});
