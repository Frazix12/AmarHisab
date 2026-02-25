import { showToast } from "@/components/ui/toast";
import { useExpenseDomain, useI18n, useSettingsDomain } from "@/contexts/app-selectors";
import {
  ExpenseForm,
  ExpenseFormValues,
} from "@/features/expenses/components/expense-form";
import { router } from "expo-router";
import React from "react";

export default function AddExpenseScreen() {
  const { addExpense } = useExpenseDomain();
  const { t } = useI18n();
  const { settings } = useSettingsDomain();

  const isSameDay = (left: Date, right: Date) => {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  };

  const handleSubmit = (values: ExpenseFormValues & { aiDetected: boolean }) => {
    const numAmount = parseFloat(values.amount);
    const selectedDate = values.date instanceof Date ? values.date : new Date(values.date);
    const isForToday = isSameDay(selectedDate, new Date());

    addExpense({
      amount: numAmount,
      category: values.category,
      date: values.date,
      description: values.description,
      currency: settings.currency.code,
      imageUri: values.imageUri,
      aiDetected: values.aiDetected,
    });

    const expenseAddedMessage =
      "expenseAdded" in t.expenses
        ? (t.expenses as { expenseAdded?: string }).expenseAdded
        : undefined;

    const expenseAddedOutsideTodayMessage =
      "expenseAddedOutsideToday" in t.expenses
        ? (t.expenses as { expenseAddedOutsideToday?: string }).expenseAddedOutsideToday
        : undefined;

    showToast(
      isForToday
        ? expenseAddedMessage || "Expense added ✓"
        : expenseAddedOutsideTodayMessage ||
            "Expense added. It won't appear in Today's list. Check Statistics.",
    );
    router.back();
  };

  return (
    <ExpenseForm
      mode="add"
      title={t.expenses.addTransaction}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
