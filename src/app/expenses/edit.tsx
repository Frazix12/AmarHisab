import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { showToast } from "@/components/ui/toast";
import { Colors } from "@/constants/theme";
import { useExpenseDomain, useI18n, useTheme } from "@/contexts/app-selectors";
import {
  ExpenseForm,
  ExpenseFormValues,
} from "@/features/expenses/components/expense-form";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { expenses, updateExpense } = useExpenseDomain();
  const { t } = useI18n();
  const colorScheme = useTheme();
  const colors = Colors[colorScheme];

  const isSameDay = (left: Date, right: Date) => {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  };

  const expense = expenses.find((e) => e.id === id);

  if (!expense) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={styles.notFoundWrap}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>
            {t.expenses.expenseNotFound}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.backButtonText, { color: colors.onPrimary }]}>
              {t.templates.goBack || t.form.cancel}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmit = (values: ExpenseFormValues & { aiDetected: boolean }) => {
    const numAmount = parseFloat(values.amount);
    if (!Number.isFinite(numAmount)) {
      showToast(t.alerts.invalidAmount || "Please enter a valid amount");
      return;
    }
    const selectedDate = values.date instanceof Date ? values.date : new Date(values.date);
    const isForToday = isSameDay(selectedDate, new Date());

    updateExpense(expense.id, {
      amount: numAmount,
      category: values.category,
      date: selectedDate,
      description: values.description,
      imageUri: values.imageUri,
    });

    const expenseUpdatedOutsideTodayMessage =
      "expenseUpdatedOutsideToday" in t.expenses
        ? (t.expenses as { expenseUpdatedOutsideToday?: string })
            .expenseUpdatedOutsideToday
        : undefined;

    showToast(
      isForToday
        ? t.expenses.expenseUpdated
        : (expenseUpdatedOutsideTodayMessage ?? t.expenses.expenseUpdated),
    );
    router.back();
  };

  return (
    <ExpenseForm
      mode="edit"
      title={t.expenses.editTransaction}
      initialValues={{
        amount: expense.amount.toString(),
        category: expense.category,
        description: expense.description || "",
        date: expense.date instanceof Date ? expense.date : new Date(expense.date),
        imageUri: expense.imageUri,
      }}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFoundWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
