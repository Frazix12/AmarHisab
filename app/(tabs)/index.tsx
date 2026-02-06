import {
  ActionMenuItem,
  ActionMenuModal,
} from "@/components/shared/action-menu-modal";
import { OnboardingTip } from "@/components/shared/onboarding-tip";
import { SummaryCard } from "@/components/shared/summary-card";
import { showToast, Toast } from "@/components/ui/toast";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { AddExpenseModal } from "@/features/expenses/components/add-expense-modal";
import { EditExpenseModal } from "@/features/expenses/components/edit-expense-modal";
import { ExpenseCard } from "@/features/expenses/components/expense-card";
import { Expense } from "@/types";
import {
  Add01Icon,
  Delete02Icon,
  Edit02Icon,
  Wallet03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ExpensesScreen() {
  const {
    deleteExpense,
    colorScheme,
    t,
    todayExpenses,
    todaysExpensesList,
    settings,
    formatNumber,
  } = useApp();
  const colors = Colors[colorScheme];
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  // Today's expenses only (already filtered in context)
  const sortedExpenses = useMemo(
    () =>
      [...todaysExpensesList].sort(
        (a, b) => b.date.getTime() - a.date.getTime(),
      ),
    [todaysExpensesList],
  );

  const handleAddExpense = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleExpensePress = useCallback((expense: Expense) => {
    // TODO: Open edit expense modal
    console.log("Edit expense", expense);
  }, []);

  const handleExpenseLongPress = useCallback((expense: Expense) => {
    // Haptic feedback on Android
    if (Platform.OS === "android") {
      Vibration.vibrate(50);
    }
    setSelectedExpense(expense);
    setShowActionMenu(true);
  }, []);

  const handleEdit = useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!selectedExpense) return;

    Alert.alert(
      t.expenses.deleteExpense,
      t.alerts.deleteExpenseMessage,
      [
        { text: t.form.cancel, style: "cancel" },
        {
          text: t.modal.delete,
          style: "destructive",
          onPress: () => {
            deleteExpense(selectedExpense.id);
            showToast(t.expenses.expenseDeleted || "Expense deleted");
          },
        },
      ],
    );
  }, [deleteExpense, selectedExpense, t]);

  const handleEditSave = useCallback(() => {
    showToast(t.expenses.expenseUpdated || "Expense updated ✓");
  }, [t]);

  const actionMenuItems = useMemo<ActionMenuItem[]>(
    () => [
      {
        label: t.form.edit || "Edit",
        icon: Edit02Icon,
        onPress: handleEdit,
        variant: "default",
      },
      {
        label: t.modal.delete || "Delete",
        icon: Delete02Icon,
        onPress: handleDelete,
        variant: "destructive",
      },
    ],
    [handleDelete, handleEdit, t],
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyState}>
        <HugeiconsIcon
          icon={Wallet03Icon}
          size={64}
          color={colors.outline}
          strokeWidth={1}
        />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t.expenses.noExpensesToday}
        </Text>
        <Text
          style={[styles.emptyDescription, { color: colors.textSecondary }]}
        >
          {t.expenses.addFirstToday}
        </Text>
      </View>
    ),
    [colors, t],
  );

  const renderExpenseItem = useCallback(
    ({ item }: { item: Expense }) => (
      <ExpenseCard
        expense={item}
        colors={colors}
        settings={settings}
        t={t}
        onPress={handleExpensePress}
        onLongPress={handleExpenseLongPress}
      />
    ),
    [colors, handleExpenseLongPress, handleExpensePress, settings, t],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.summarySection}>
        <SummaryCard
          icon={Wallet03Icon}
          title={t.expenses.todayTotal}
          amount={todayExpenses}
          variant="primary"
        />
        <View
          style={[
            styles.itemCountCard,
            { backgroundColor: colors.surface, borderColor: colors.outline },
          ]}
        >
          <Text style={[styles.itemCountText, { color: colors.textSecondary }]}>
            {formatNumber(sortedExpenses.length)} {t.expenses.itemCount}
          </Text>
        </View>
      </View>
    ),
    [colors, formatNumber, sortedExpenses.length, t, todayExpenses],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t.expenses.title}
        </Text>
      </View>

      {/* Onboarding Tip */}
      <OnboardingTip screenKey="expenses" />

      <FlatList
        data={sortedExpenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpenseItem}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={<View style={styles.bottomSpacer} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      />

      {/* Floating Action Button */}
      <Pressable
        onPress={handleAddExpense}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.shadow,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <HugeiconsIcon
          icon={Add01Icon}
          size={28}
          color={colors.onPrimary}
          strokeWidth={2.5}
        />
      </Pressable>

      {/* Add Expense Modal */}
      <AddExpenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />

      {/* Action Menu */}
      {selectedExpense && (
        <ActionMenuModal
          visible={showActionMenu}
          onClose={() => setShowActionMenu(false)}
          actions={actionMenuItems}
          itemTitle={selectedExpense.description || selectedExpense.category}
        />
      )}

      {/* Edit Expense Modal */}
      {selectedExpense && (
        <EditExpenseModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          expense={selectedExpense}
          onSave={handleEditSave}
        />
      )}

      {/* Toast Notifications */}
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  summarySection: {
    marginBottom: 24,
  },
  itemCountCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    alignItems: "center",
    width: "100%",
  },
  itemCountText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    flexShrink: 1,
    includeFontPadding: true,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 26,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateGroupTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 80,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
