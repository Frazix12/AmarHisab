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
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";

const DATE_GROUP_ORDER: DateGroup[] = [
  "today",
  "yesterday",
  "thisWeek",
  "thisMonth",
  "older",
];

interface HistorySection {
  title: DateGroup;
  data: Expense[];
}

type HistoryListItem =
  | { type: "header"; id: string; title: DateGroup }
  | { type: "item"; id: string; expense: Expense }
  | { type: "footer"; id: string };

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
  const { width: screenWidth } = useWindowDimensions();
  const summaryCardWidth = screenWidth - 120;
  const summarySideInset = (screenWidth - summaryCardWidth) / 2;
  const summarySnapInterval = summaryCardWidth + 12;
  const isBangla = settings.language === "bn";
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  // Sort expenses by date (newest first)
  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [expenses],
  );

  const filteredSortedExpenses = useMemo(
    () =>
      selectedCategory
        ? sortedExpenses.filter((expense) => expense.category === selectedCategory)
        : sortedExpenses,
    [selectedCategory, sortedExpenses],
  );

  const groupedExpenses = useMemo(
    () => groupExpensesByDate(filteredSortedExpenses),
    [filteredSortedExpenses],
  );

  const monthExpenseCount = useMemo(() => {
    const now = new Date();
    return sortedExpenses.filter(
      (expense) =>
        expense.date.getFullYear() === now.getFullYear() &&
        expense.date.getMonth() === now.getMonth(),
    ).length;
  }, [sortedExpenses]);

  const weekExpenseCount = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay());

    return sortedExpenses.filter((expense) => expense.date >= startOfWeek).length;
  }, [sortedExpenses]);

  const avgDaily = useMemo(() => {
    const currentDay = new Date().getDate();
    return currentDay > 0 ? monthExpenses / currentDay : 0;
  }, [monthExpenses]);

  const summaryCards = useMemo(
    () => [
      {
        key: "all-time",
        icon: Wallet03Icon,
        title: t.statistics?.allTime || "All Time",
        amount: totalExpenses,
        variant: "primary" as const,
        description: `${formatNumber(sortedExpenses.length)} ${
          sortedExpenses.length === 1 ? t.common.item : t.common.items
        }`,
      },
      {
        key: "this-month",
        icon: Calendar03Icon,
        title: t.statistics?.thisMonth || "This Month",
        amount: monthExpenses,
        variant: "secondary" as const,
        description: `${formatNumber(monthExpenseCount)} ${
          monthExpenseCount === 1 ? t.common.item : t.common.items
        }`,
      },
      {
        key: "this-week",
        icon: Calendar03Icon,
        title: t.statistics?.thisWeek || "This Week",
        amount: weekExpenses,
        variant: "success" as const,
        description: `${formatNumber(weekExpenseCount)} ${
          weekExpenseCount === 1 ? t.common.item : t.common.items
        }`,
      },
      {
        key: "daily-avg",
        icon: Analytics01Icon,
        title: t.statistics?.avgDaily || "Daily Avg",
        amount: avgDaily,
        variant: "secondary" as const,
        description: `${t.statistics?.thisMonth || "This Month"} ${formatNumber(
          monthExpenseCount,
        )} ${monthExpenseCount === 1 ? t.common.item : t.common.items}`,
      },
    ],
    [
      avgDaily,
      formatNumber,
      monthExpenseCount,
      monthExpenses,
      sortedExpenses.length,
      t,
      totalExpenses,
      weekExpenseCount,
      weekExpenses,
    ],
  );

  const selectedCategoryBreakdown = useMemo(
    () =>
      selectedCategory
        ? categoryBreakdown.find((item) => item.category === selectedCategory) ?? null
        : null,
    [categoryBreakdown, selectedCategory],
  );

  const handleExpensePress = useCallback((expense: Expense) => {
    console.log("Edit expense", expense);
  }, []);

  const handleExpenseLongPress = useCallback((expense: Expense) => {
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

  const historySections = useMemo<HistorySection[]>(
    () =>
      DATE_GROUP_ORDER.flatMap((groupName) => {
        const groupExpenses = groupedExpenses.get(groupName);
        if (!groupExpenses || groupExpenses.length === 0) return [];
        return [{ title: groupName, data: groupExpenses }];
      }),
    [groupedExpenses],
  );

  const historyListItems = useMemo<HistoryListItem[]>(
    () =>
      historySections.flatMap((section) => [
        {
          type: "header" as const,
          id: `header-${section.title}`,
          title: section.title,
        },
        ...section.data.map((expense) => ({
          type: "item" as const,
          id: expense.id,
          expense,
        })),
        {
          type: "footer" as const,
          id: `footer-${section.title}`,
        },
      ]),
    [historySections],
  );

  const renderHistoryItem = useCallback(
    ({ item }: { item: HistoryListItem }) => {
      if (item.type === "header") {
        return (
          <Text
            style={[
              styles.dateGroupTitle,
              { color: colors.textSecondary },
              isBangla && styles.dateGroupTitleBangla,
            ]}
          >
            {t.common[item.title]}
          </Text>
        );
      }

      if (item.type === "footer") {
        return <View style={styles.sectionFooter} />;
      }

      return (
        <ExpenseCard
          expense={item.expense}
          colors={colors}
          settings={settings}
          t={t}
          onPress={handleExpensePress}
          onLongPress={handleExpenseLongPress}
        />
      );
    },
    [
      colors,
      handleExpenseLongPress,
      handleExpensePress,
      isBangla,
      settings,
      t,
    ],
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyState} testID="statistics-empty-state">
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
          <FlashList
            data={summaryCards}
            horizontal
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToAlignment="start"
            snapToInterval={summarySnapInterval}
            disableIntervalMomentum
            contentContainerStyle={[
              styles.summaryListContent,
              { paddingHorizontal: summarySideInset },
            ]}
            renderItem={({ item, index }) => (
              <View
                style={[
                  styles.summaryCardSlide,
                  {
                    width: summaryCardWidth,
                    marginLeft: index === 0 ? -summarySideInset : 0,
                    marginRight: index === summaryCards.length - 1 ? 0 : 12,
                  },
                ]}
              >
                <SummaryCard
                  icon={item.icon}
                  title={item.title}
                  amount={item.amount}
                  variant={item.variant}
                  description={item.description}
                  size="large"
                  testID={`statistics-summary-card-${item.key}`}
                />
              </View>
            )}
          />
        </View>

        {categoryBreakdown.length > 0 && (
          <View style={styles.categorySection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t.statistics?.byCategory || "By Category"}
            </Text>
            <FlashList
              data={categoryBreakdown}
              horizontal
              keyExtractor={(item) => item.category}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPillsRow}
              renderItem={({ item }) => {
                const isSelected = selectedCategory === item.category;
                return (
                  <Pressable
                    onPress={() =>
                      setSelectedCategory((currentCategory) =>
                        currentCategory === item.category ? null : item.category,
                      )
                    }
                    testID={`statistics-category-pill-${item.category}`}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: isSelected
                          ? colors.primaryContainer
                          : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.outline,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        { color: isSelected ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {t.categories[item.category]}
                    </Text>
                  </Pressable>
                );
              }}
            />

            {selectedCategoryBreakdown ? (
              <View
                style={[
                  styles.categorySelectedMeta,
                  { backgroundColor: colors.surface, borderColor: colors.outline },
                ]}
              >
                <Text style={[styles.categorySelectedMetaText, { color: colors.text }]}>
                  {formatNumber(Math.round(selectedCategoryBreakdown.percentage))}% •{" "}
                  {formatNumber(selectedCategoryBreakdown.count)}{" "}
                  {selectedCategoryBreakdown.count === 1 ? t.common.item : t.common.items}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {filteredSortedExpenses.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}> 
              {t.statistics?.history || "History"}
            </Text>
          </View>
        )}
      </View>
    ),
    [
      categoryBreakdown,
      colors,
      formatNumber,
      filteredSortedExpenses.length,
      selectedCategory,
      selectedCategoryBreakdown,
      summaryCardWidth,
      summarySideInset,
      summarySnapInterval,
      summaryCards,
      t,
    ],
  );
  const pageTransitionStyle = usePageTransition();

  return (
    <SafeAreaView
      testID="screen-statistics"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Animated.View style={[styles.screenTransition, pageTransitionStyle]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t.statistics?.title || "Statistics"}
        </Text>
      </View>

      <FlashList
        data={historyListItems}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        getItemType={(item) => item.type}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={<View style={styles.bottomSpacer} />}
        testID="statistics-history-list"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
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
  summaryListContent: {
    paddingRight: 0,
  },
  summaryCardSlide: {
    flexShrink: 0,
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
  categoryPillsRow: {
    paddingRight: 6,
  },
  categoryPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 10,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  categorySelectedMeta: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categorySelectedMetaText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
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
