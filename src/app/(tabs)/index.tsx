import {
  ActionMenuItem,
  ActionMenuModal,
} from "@/components/shared/action-menu-modal";
import { OnboardingTip } from "@/components/shared/onboarding-tip";
import { SummaryCard } from "@/components/shared/summary-card";
import { showToast } from "@/components/ui/toast";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import {
  useExpenseDomain,
  useI18n,
  useSettingsDomain,
  useTheme,
} from "@/contexts/app-selectors";
import { ExpenseCard } from "@/features/expenses/components/expense-card";
import { Expense } from "@/types";
import { usePageTransition } from "@/utils/animations";
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
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";

const FAB_SIZE = 60;
const FAB_RIGHT = 20;
const FAB_BOTTOM = 20;

export default function ExpensesScreen() {
  const { deleteExpense, todayExpenses, todaysExpensesList } = useExpenseDomain();
  const colorScheme = useTheme();
  const { t, formatNumber } = useI18n();
  const { settings } = useSettingsDomain();
  const colors = Colors[colorScheme];
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

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
    router.push("/expenses/add" as any);
  }, []);

  const handleExpensePress = useCallback((_expense: Expense) => {
    // TODO: Open edit expense modal
  }, []);

  const handleExpenseLongPress = useCallback((expense: Expense) => {
    setSelectedExpense(expense);
    setShowActionMenu(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (selectedExpense) {
      setShowActionMenu(false);
      router.push(`/expenses/edit?id=${selectedExpense.id}` as any);
    }
  }, [selectedExpense]);

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
        showCategory={false}
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
  const pageTransitionStyle = usePageTransition();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Animated.View style={[styles.screenTransition, pageTransitionStyle]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t.expenses.title}
        </Text>
      </View>

      {/* Onboarding Tip */}
      <OnboardingTip screenKey="expenses" />

      <FlashList
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
      <View
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <Pressable
          onPress={handleAddExpense}
          style={({ pressed }) => [
            styles.fabPressable,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t.expenses.addExpense}
        >
          <HugeiconsIcon
            icon={Add01Icon}
            size={28}
            color={colors.onPrimary}
            strokeWidth={2.5}
          />
        </Pressable>
      </View>

      {/* Action Menu */}
      {selectedExpense && (
        <ActionMenuModal
          visible={showActionMenu}
          onClose={() => setShowActionMenu(false)}
          actions={actionMenuItems}
          itemTitle={selectedExpense.description || selectedExpense.category}
        />
      )}

      {/* Toast Notifications */}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenTransition: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
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
    right: FAB_RIGHT,
    bottom: FAB_BOTTOM,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 60,
  },
  fabPressable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
