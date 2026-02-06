import {
  ActionMenuItem,
  ActionMenuModal,
} from "@/components/shared/action-menu-modal";
import { SummaryCard } from "@/components/shared/summary-card";
import { showToast, Toast } from "@/components/ui/toast";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { EditExpenseModal } from "@/features/expenses/components/edit-expense-modal";
import { ExpenseCard } from "@/features/expenses/components/expense-card";
import { Expense } from "@/types";
import { DateGroup, groupExpensesByDate } from "@/utils/date";
import { usePageTransition } from "@/utils/animations";
import {
  Analytics01Icon,
  Calendar03Icon,
  Delete02Icon,
  Edit02Icon,
  PieChartIcon,
  Wallet03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const DATE_GROUP_ORDER: DateGroup[] = [
  "today",
  "yesterday",
  "thisWeek",
  "thisMonth",
  "older",
];

export default function StatisticsScreen() {
  const {
    expenses,
    deleteExpense,
    colorScheme,
    t,
    formatNumber,
    totalExpenses,
    monthExpenses,
    weekExpenses,
    categoryBreakdown,
    settings,
  } = useApp();
  const colors = Colors[colorScheme];
  const isBangla = settings.language === "bn";
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  // Sort expenses by date (newest first)
  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [expenses],
  );
  const groupedExpenses = useMemo(
    () => groupExpensesByDate(sortedExpenses),
    [sortedExpenses],
  );

  const avgDaily = useMemo(() => {
    const currentDay = new Date().getDate();
    return currentDay > 0 ? monthExpenses / currentDay : 0;
  }, [monthExpenses]);

  const handleExpensePress = useCallback((expense: Expense) => {
    console.log("Edit expense", expense);
  }, []);

  const handleExpenseLongPress = useCallback((expense: Expense) => {
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

  const historySections = useMemo(
    () =>
      DATE_GROUP_ORDER.flatMap((groupName) => {
        const groupExpenses = groupedExpenses.get(groupName);
        if (!groupExpenses || groupExpenses.length === 0) return [];
        return [{ title: groupName, data: groupExpenses }];
      }),
    [groupedExpenses],
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

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: DateGroup } }) => (
      <Text
        style={[
          styles.dateGroupTitle,
          { color: colors.textSecondary },
          isBangla && styles.dateGroupTitleBangla,
        ]}
      >
        {t.common[section.title]}
      </Text>
    ),
    [colors, isBangla, t],
  );

  const renderSectionFooter = useCallback(
    () => <View style={styles.sectionFooter} />,
    [],
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyState}>
        <HugeiconsIcon
          icon={PieChartIcon}
          size={64}
          color={colors.outline}
          strokeWidth={1}
        />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t.statistics?.noStats || "No expenses yet"}
        </Text>
        <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
          {t.statistics?.startTracking ||
            "Start tracking to see your statistics"}
        </Text>
      </View>
    ),
    [colors, t],
  );

  const listHeader = useMemo(
    () => (
      <View>
        <View style={styles.summarySection}>
          <SummaryCard
            icon={Wallet03Icon}
            title={t.statistics?.allTime || "All Time"}
            amount={totalExpenses}
            variant="primary"
          />
          <SummaryCard
            icon={Calendar03Icon}
            title={t.statistics?.thisMonth || "This Month"}
            amount={monthExpenses}
            variant="secondary"
          />
          <SummaryCard
            icon={Calendar03Icon}
            title={t.statistics?.thisWeek || "This Week"}
            amount={weekExpenses}
            variant="success"
          />
          <SummaryCard
            icon={Analytics01Icon}
            title={t.statistics?.avgDaily || "Daily Avg"}
            amount={avgDaily}
            variant="secondary"
          />
        </View>

        {categoryBreakdown.length > 0 && (
          <View style={styles.categorySection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t.statistics?.byCategory || "By Category"}
            </Text>
            {categoryBreakdown.map((item) => (
              <View
                key={item.category}
                style={[
                  styles.categoryItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.outline,
                  },
                ]}
              >
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {t.categories[item.category]}
                  </Text>
                  <Text
                    style={[
                      styles.categoryDetails,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {formatNumber(item.count)} {item.count === 1 ? t.common.item : t.common.items} •{" "}
                    {formatNumber(Math.round(item.percentage))}%
                  </Text>
                </View>
                <View style={styles.categoryAmountContainer}>
                  <View style={styles.categoryBarContainer}>
                    <View
                      style={[
                        styles.categoryBar,
                        {
                          backgroundColor: colors.primary,
                          width: `${item.percentage}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.categoryAmount, { color: colors.text }]}>
                    {formatNumber(item.amount)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {sortedExpenses.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t.statistics?.history || "History"}
            </Text>
          </View>
        )}
      </View>
    ),
    [
      avgDaily,
      categoryBreakdown,
      colors,
      formatNumber,
      monthExpenses,
      sortedExpenses.length,
      t,
      totalExpenses,
      weekExpenses,
    ],
  );
  const pageTransitionStyle = usePageTransition();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Animated.View style={[styles.screenTransition, pageTransitionStyle]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t.statistics?.title || "Statistics"}
        </Text>
      </View>

      <SectionList
        sections={historySections}
        keyExtractor={(item) => item.id}
        renderItem={renderExpenseItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
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
        stickySectionHeadersEnabled={false}
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
  },
  summarySection: {
    marginBottom: 24,
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    lineHeight: 24,
  },
  categoryItem: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryInfo: {
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 22,
  },
  categoryDetails: {
    fontSize: 14,
    lineHeight: 18,
  },
  categoryAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginRight: 12,
    overflow: "hidden",
  },
  categoryBar: {
    height: "100%",
    borderRadius: 4,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: "600",
    minWidth: 80,
    textAlign: "right",
    lineHeight: 22,
  },
  historySection: {
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
  dateGroupTitleBangla: {
    textTransform: "none",
    letterSpacing: 0,
    lineHeight: 18,
  },
  sectionFooter: {
    height: 24,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 26,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 40,
  },
});
