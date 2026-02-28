import React from "react";
import { render } from "@testing-library/react-native";

import { getTranslation } from "@/services/i18n";
import { useApp } from "@/contexts/app-context";

import ExpensesScreen from "@/app/(tabs)/index";
import GroceryScreen from "@/app/(tabs)/list";
import StatisticsScreen from "@/app/(tabs)/statistics";
import SettingsScreen from "@/app/(tabs)/settings";
import TemplatesScreen from "@/app/templates/index";
import AddTemplateScreen from "@/app/templates/add";
import EditTemplateScreen from "@/app/templates/edit";

jest.mock("@/features/templates/services/template-learner", () => ({
  TemplateLearner: {
    trackGroceryItem: jest.fn(),
    detectLearningCandidates: jest.fn(async () => null),
    recordSuggestion: jest.fn(),
    dismissForever: jest.fn(),
  },
}));

jest.mock("@/features/templates/services/learning-storage", () => ({
  LearningStorage: {
    clear: jest.fn(),
  },
}));

jest.mock("@/services/storage", () => ({
  resetOnboardingCompleted: jest.fn(async () => {}),
}));

jest.mock("@/contexts/app-context", () => {
  const useApp = jest.fn();

  return {
    useApp,
    useExpenseSlice: jest.fn(() => {
      const context = useApp();
      return {
        expenses: context.expenses,
        addExpense: context.addExpense,
        updateExpense: context.updateExpense,
        deleteExpense: context.deleteExpense,
        totalExpenses: context.totalExpenses,
        todayExpenses: context.todayExpenses,
        monthExpenses: context.monthExpenses,
        weekExpenses: context.weekExpenses,
        todaysExpensesList: context.todaysExpensesList,
        categoryBreakdown: context.categoryBreakdown,
      };
    }),
    useGrocerySlice: jest.fn(() => {
      const context = useApp();
      return {
        groceryItems: context.groceryItems,
        addGroceryItem: context.addGroceryItem,
        updateGroceryItem: context.updateGroceryItem,
        deleteGroceryItem: context.deleteGroceryItem,
        toggleGroceryItem: context.toggleGroceryItem,
        clearCompletedGroceryItems: context.clearCompletedGroceryItems,
        itemPendingCompletion: context.itemPendingCompletion,
        setItemPendingCompletion: context.setItemPendingCompletion,
        completeGroceryItem: context.completeGroceryItem,
      };
    }),
    useSettingsSlice: jest.fn(() => {
      const context = useApp();
      return {
        settings: context.settings,
        updateCurrency: context.updateCurrency,
        updateTheme: context.updateTheme,
        updateLanguage: context.updateLanguage,
        updateApiKey: context.updateApiKey,
        updateElevenLabsApiKey: context.updateElevenLabsApiKey,
        clearAllData: context.clearAllData,
      };
    }),
    useTemplateSlice: jest.fn(() => {
      const context = useApp();
      return {
        templates: context.templates,
        addTemplate: context.addTemplate,
        updateTemplate: context.updateTemplate,
        deleteTemplate: context.deleteTemplate,
        findMatchingTemplates: context.findMatchingTemplates,
        applyTemplate: context.applyTemplate,
      };
    }),
    useLearningSlice: jest.fn(() => {
      const context = useApp();
      return {
        checkForSuggestions: context.checkForSuggestions,
        acceptSuggestion: context.acceptSuggestion,
        dismissSuggestion: context.dismissSuggestion,
        smartSuggestionsEnabled: context.smartSuggestionsEnabled,
        toggleSmartSuggestions: context.toggleSmartSuggestions,
      };
    }),
    useThemeSlice: jest.fn(() => ({
      colorScheme: useApp().colorScheme,
    })),
    useI18nSlice: jest.fn(() => {
      const context = useApp();
      return { t: context.t, formatNumber: context.formatNumber };
    }),
  };
});

jest.mock("@/components/shared/action-menu-modal", () => ({
  ActionMenuModal: () => null,
}));

jest.mock("@/components/shared/onboarding-tip", () => ({
  OnboardingTip: () => null,
}));

jest.mock("@/components/shared/summary-card", () => ({
  SummaryCard: () => null,
}));

jest.mock("@/components/ui/toast", () => ({
  Toast: () => null,
  showToast: jest.fn(),
}));

jest.mock("@/features/expenses/components/expense-card", () => ({
  ExpenseCard: () => null,
}));

jest.mock("@/features/grocery/components/add-grocery-modal", () => ({
  AddGroceryModal: () => null,
}));

jest.mock("@/features/grocery/components/complete-grocery-modal", () => ({
  CompleteGroceryModal: () => null,
}));

jest.mock("@/features/grocery/components/edit-grocery-modal", () => ({
  EditGroceryModal: () => null,
}));

jest.mock("@/features/grocery/components/grocery-item", () => ({
  GroceryItemComponent: () => null,
}));

jest.mock("@/features/templates/components/template-suggestion-card", () => ({
  TemplateSuggestionCard: () => null,
}));

jest.mock("@/features/settings/components/setting-selection-modal", () => ({
  SettingSelectionModal: () => null,
}));

jest.mock("@/utils/sample-data", () => ({
  useSampleData: () => ({
    addSampleExpenses: jest.fn(),
    addSampleGroceryItems: jest.fn(),
  }),
}));

describe("screen smoke tests", () => {
  const t = getTranslation("en");
  const mockUseApp = useApp as jest.Mock;

  const baseContext = {
    expenses: [],
    groceryItems: [],
    templates: [],
    settings: {
      currency: { code: "USD", symbol: "$", name: "US Dollar" },
      theme: "light",
      language: "en",
      geminiApiKey: "",
      elevenLabsApiKey: "",
    },
    colorScheme: "light",
    t,
    formatNumber: (value: number | string) => value.toString(),
    totalExpenses: 0,
    todayExpenses: 0,
    monthExpenses: 0,
    weekExpenses: 0,
    todaysExpensesList: [],
    categoryBreakdown: [],
    smartSuggestionsEnabled: true,
    itemPendingCompletion: null,
    addExpense: jest.fn(),
    updateExpense: jest.fn(),
    deleteExpense: jest.fn(),
    addGroceryItem: jest.fn(),
    updateGroceryItem: jest.fn(),
    deleteGroceryItem: jest.fn(),
    toggleGroceryItem: jest.fn(),
    clearCompletedGroceryItems: jest.fn(),
    setItemPendingCompletion: jest.fn(),
    completeGroceryItem: jest.fn(),
    updateCurrency: jest.fn(),
    updateTheme: jest.fn(),
    updateLanguage: jest.fn(),
    updateApiKey: jest.fn(),
    updateElevenLabsApiKey: jest.fn(),
    addTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    findMatchingTemplates: jest.fn(),
    applyTemplate: jest.fn(),
    checkForSuggestions: jest.fn().mockResolvedValue(null),
    acceptSuggestion: jest.fn(),
    dismissSuggestion: jest.fn(),
    toggleSmartSuggestions: jest.fn(),
    clearAllData: jest.fn(),
  };

  beforeEach(() => {
    mockUseApp.mockReturnValue(baseContext);
  });

  it("renders Expenses screen", () => {
    const { getByText } = render(<ExpensesScreen />);
    expect(getByText(t.expenses.title)).toBeTruthy();
  });

  it("renders Grocery screen", () => {
    const { getByText } = render(<GroceryScreen />);
    expect(getByText(t.grocery.title)).toBeTruthy();
  });

  it("renders Statistics screen", () => {
    const { getByText } = render(<StatisticsScreen />);
    expect(getByText(t.statistics.title)).toBeTruthy();
  });

  it("renders Settings screen", () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText(t.settings.title)).toBeTruthy();
  });

  it("renders Templates screens", () => {
    const { getByText: getByTextList } = render(<TemplatesScreen />);
    expect(getByTextList(t.templates.title)).toBeTruthy();

    const { getByText: getByTextAdd } = render(<AddTemplateScreen />);
    expect(getByTextAdd(t.templates.newTemplate)).toBeTruthy();

    const { getByText: getByTextEdit } = render(<EditTemplateScreen />);
    expect(getByTextEdit(t.templates.templateNotFound)).toBeTruthy();
  });
});
