import {
  ActionMenuItem,
  ActionMenuModal,
} from "@/components/shared/action-menu-modal";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { showToast } from "@/components/ui/toast";
import { Colors } from "@/constants/theme";
import {
  useExpenseDomain,
  useI18n,
  useSettingsDomain,
  useTheme,
} from "@/contexts/app-selectors";
import { ExpenseCard } from "@/features/expenses/components/expense-card";
import { Expense, ExpenseCategory } from "@/types";
import { usePageTransition } from "@/utils/animations";
import { formatCurrency } from "@/utils/currency";
import { DateGroup, groupExpensesByDate } from "@/utils/date";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Delete02Icon,
  Edit02Icon,
  PieChartIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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

const PERIOD_MONTH_COUNT = 2;

interface HistorySection {
  title: DateGroup;
  data: Expense[];
}

type HistoryListItem =
  | { type: "header"; id: string; title: DateGroup }
  | { type: "item"; id: string; expense: Expense }
  | { type: "footer"; id: string };

interface CategoryPillItemType {
  key: string;
  category: ExpenseCategory | null;
  label: string;
}

type StatisticsTranslation = ReturnType<typeof useI18n>["t"];

interface CategoryPillProps {
  item: CategoryPillItemType;
  isSelected: boolean;
  onPress: () => void;
  t: StatisticsTranslation;
}

interface PeriodWindow {
  start: Date;
  end: Date;
}

interface MonthOption {
  key: string;
  value: Date;
  label: string;
}

const CategoryPill = React.memo(
  ({ item, isSelected, onPress, t }: CategoryPillProps) => {
    return (
      <Pressable
        haptic="light"
        onPress={onPress}
        style={({ pressed }) => [
          styles.categoryPill,
          isSelected && styles.categoryPillActive,
          pressed && styles.pressedScale,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${t.statistics?.byCategory || "By Category"}: ${item.label}`}
      >
        <Text
          style={[
            styles.categoryPillText,
            isSelected && styles.categoryPillTextActive,
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  },
  (prev, next) =>
    prev.item.key === next.item.key &&
    prev.isSelected === next.isSelected,
);

CategoryPill.displayName = "CategoryPill";

const getLocale = (language: string): string =>
  language === "bn" ? "bn-BD" : "en-US";

const getMonthStart = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);

const getMonthEnd = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const compareMonth = (left: Date, right: Date): number => {
  const leftMonth = left.getFullYear() * 12 + left.getMonth();
  const rightMonth = right.getFullYear() * 12 + right.getMonth();
  return leftMonth - rightMonth;
};

const shiftWindowByMonths = (window: PeriodWindow, delta: number): PeriodWindow => {
  const start = new Date(window.start.getFullYear(), window.start.getMonth() + delta, 1);
  const endMonth = new Date(window.end.getFullYear(), window.end.getMonth() + delta, 1);

  return {
    start: getMonthStart(start),
    end: getMonthEnd(endMonth),
  };
};

const formatRangeLabel = (start: Date, end: Date, language: string): string => {
  const locale = getLocale(language);
  const startMonthLabel = start.toLocaleString(locale, { month: "short" });
  const endMonthLabel = end.toLocaleString(locale, { month: "short" });

  if (startMonthLabel === endMonthLabel && start.getFullYear() === end.getFullYear()) {
    return startMonthLabel;
  }

  return `${startMonthLabel}-${endMonthLabel}`;
};

const getPeriodWindow = (offset: number): PeriodWindow => {
  const now = new Date();
  const endMonthOffset = now.getMonth() + offset;
  const startMonthOffset = endMonthOffset - (PERIOD_MONTH_COUNT - 1);

  const start = new Date(now.getFullYear(), startMonthOffset, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), endMonthOffset + 1, 0, 23, 59, 59, 999);

  return { start, end };
};

export default function StatisticsScreen() {
  const { expenses, deleteExpense } = useExpenseDomain();
  const { settings } = useSettingsDomain();
  const colorScheme = useTheme();
  const { t, formatNumber } = useI18n();

  const colors = Colors[colorScheme];
  const { width: screenWidth } = useWindowDimensions();
  const horizontalPadding = screenWidth >= 768 ? 24 : 16;
  const maxContentWidth = Math.min(screenWidth, 768);
  const isBangla = settings.language === "bn";

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [periodOffset, setPeriodOffset] = useState(0);
  const [customRange, setCustomRange] = useState<PeriodWindow | null>(null);
  const [showMonthRangeModal, setShowMonthRangeModal] = useState(false);
  const [pickerStartMonth, setPickerStartMonth] = useState<Date>(getMonthStart(new Date()));
  const [pickerEndMonth, setPickerEndMonth] = useState<Date>(getMonthStart(new Date()));
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(
    null,
  );

  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [expenses],
  );

  const defaultPeriodWindow = useMemo(() => getPeriodWindow(periodOffset), [periodOffset]);

  const activePeriodWindow = useMemo(
    () => customRange ?? defaultPeriodWindow,
    [customRange, defaultPeriodWindow],
  );

  const periodLabel = useMemo(
    () =>
      formatRangeLabel(
        activePeriodWindow.start,
        activePeriodWindow.end,
        settings.language,
      ),
    [activePeriodWindow.end, activePeriodWindow.start, settings.language],
  );

  const monthOptions = useMemo<MonthOption[]>(() => {
    const locale = getLocale(settings.language);
    const nowMonthStart = getMonthStart(new Date());
    const fallbackStart = new Date(
      nowMonthStart.getFullYear(),
      nowMonthStart.getMonth() - 23,
      1,
    );
    const oldestExpenseDate =
      sortedExpenses.length > 0 ? sortedExpenses[sortedExpenses.length - 1].date : null;
    const oldestExpenseMonth = oldestExpenseDate ? getMonthStart(oldestExpenseDate) : null;
    const firstMonth =
      oldestExpenseMonth && oldestExpenseMonth < fallbackStart
        ? oldestExpenseMonth
        : fallbackStart;

    const options: MonthOption[] = [];
    const cursor = new Date(firstMonth);

    while (cursor <= nowMonthStart) {
      const currentMonth = new Date(cursor);
      options.push({
        key: `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`,
        value: currentMonth,
        label: currentMonth.toLocaleString(locale, {
          month: "short",
          year: "numeric",
        }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return options.reverse();
  }, [settings.language, sortedExpenses]);

  const isNextDisabled = useMemo(() => {
    if (!customRange) {
      return periodOffset === 0;
    }

    const currentMonth = getMonthStart(new Date());
    return compareMonth(getMonthStart(customRange.end), currentMonth) >= 0;
  }, [customRange, periodOffset]);

  const periodExpenses = useMemo(
    () =>
      sortedExpenses.filter(
        (expense) =>
          expense.date >= activePeriodWindow.start &&
          expense.date <= activePeriodWindow.end,
      ),
    [activePeriodWindow.end, activePeriodWindow.start, sortedExpenses],
  );

  const periodTotal = useMemo(
    () => periodExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [periodExpenses],
  );

  const periodCategoryBreakdown = useMemo(() => {
    if (periodExpenses.length === 0) {
      return [];
    }

    const totals = new Map<ExpenseCategory, { amount: number; count: number }>();
    periodExpenses.forEach((expense) => {
      const current = totals.get(expense.category) ?? { amount: 0, count: 0 };
      totals.set(expense.category, {
        amount: current.amount + expense.amount,
        count: current.count + 1,
      });
    });

    return Array.from(totals.entries())
      .map(([category, value]) => ({
        category,
        amount: value.amount,
        count: value.count,
        percentage: periodTotal > 0 ? (value.amount / periodTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodExpenses, periodTotal]);

  const filteredSortedExpenses = useMemo(
    () =>
      selectedCategory
        ? periodExpenses.filter((expense) => expense.category === selectedCategory)
        : periodExpenses,
    [periodExpenses, selectedCategory],
  );

  const groupedExpenses = useMemo(
    () => groupExpensesByDate(filteredSortedExpenses),
    [filteredSortedExpenses],
  );

  const categoryPills = useMemo<CategoryPillItemType[]>(
    () => [
      {
        key: "all",
        category: null,
        label: t.statistics?.allCategories || "All",
      },
      ...periodCategoryBreakdown.map((item) => ({
        key: item.category,
        category: item.category,
        label: t.categories[item.category],
      })),
    ],
    [periodCategoryBreakdown, t.categories, t.statistics?.allCategories],
  );

  const selectedCategoryBreakdown = useMemo(
    () =>
      selectedCategory
        ? periodCategoryBreakdown.find((item) => item.category === selectedCategory) ??
          null
        : null,
    [periodCategoryBreakdown, selectedCategory],
  );

  const periodItemLabel = useMemo(
    () =>
      `${formatNumber(periodExpenses.length)} ${
        periodExpenses.length === 1 ? t.common.item : t.common.items
      }`,
    [formatNumber, periodExpenses.length, t],
  );

  const periodAmountLabel = useMemo(
    () => formatCurrency(periodTotal, settings.currency, settings.language),
    [periodTotal, settings.currency, settings.language],
  );

  const handleExpensePress = useCallback((expense: Expense) => {
    router.push(`/expenses/edit?id=${expense.id}` as any);
  }, []);

  const handleExpenseLongPress = useCallback((expense: Expense) => {
    setSelectedExpense(expense);
    setShowActionMenu(true);
  }, []);

  const handlePreviousPeriod = useCallback(() => {
    if (customRange) {
      setCustomRange((currentRange) =>
        currentRange ? shiftWindowByMonths(currentRange, -1) : currentRange,
      );
    } else {
      setPeriodOffset((current) => current - 1);
    }
    setSelectedCategory(null);
  }, [customRange]);

  const handleNextPeriod = useCallback(() => {
    if (isNextDisabled) {
      return;
    }

    if (customRange) {
      setCustomRange((currentRange) =>
        currentRange ? shiftWindowByMonths(currentRange, 1) : currentRange,
      );
    } else {
      setPeriodOffset((current) => Math.min(current + 1, 0));
    }
    setSelectedCategory(null);
  }, [customRange, isNextDisabled]);

  const openMonthRangeModal = useCallback(() => {
    setPickerStartMonth(getMonthStart(activePeriodWindow.start));
    setPickerEndMonth(getMonthStart(activePeriodWindow.end));
    setShowMonthRangeModal(true);
  }, [activePeriodWindow.end, activePeriodWindow.start]);

  const closeMonthRangeModal = useCallback(() => {
    setShowMonthRangeModal(false);
  }, []);

  const handleApplyMonthRange = useCallback(() => {
    const isStartAfterEnd = compareMonth(pickerStartMonth, pickerEndMonth) > 0;
    const normalizedStart = isStartAfterEnd ? pickerEndMonth : pickerStartMonth;
    const normalizedEnd = isStartAfterEnd ? pickerStartMonth : pickerEndMonth;

    setCustomRange({
      start: getMonthStart(normalizedStart),
      end: getMonthEnd(normalizedEnd),
    });
    setSelectedCategory(null);
    setShowMonthRangeModal(false);
  }, [pickerEndMonth, pickerStartMonth]);

  const handleResetFilters = useCallback(() => {
    setSelectedCategory(null);
    setPeriodOffset(0);
    setCustomRange(null);
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

  const historySections = useMemo<HistorySection[]>(
    () =>
      DATE_GROUP_ORDER.flatMap((groupName) => {
        const groupData = groupedExpenses.get(groupName);
        if (!groupData || groupData.length === 0) return [];
        return [{ title: groupName, data: groupData }];
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
          <Text style={[styles.dateGroupTitle, isBangla && styles.dateGroupTitleBangla]}>
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

  const renderEmptyState = useCallback(() => {
    const hasExpenses = expenses.length > 0;
    const noPeriodData = hasExpenses && periodExpenses.length === 0;
    const noCategoryData = periodExpenses.length > 0 && filteredSortedExpenses.length === 0;

    const title = !hasExpenses
      ? t.statistics?.noStats || "No expenses yet"
      : noCategoryData
        ? t.statistics?.noCategoryData || "No expenses in this category"
        : t.statistics?.noPeriodData || "No expenses in this period";

    const description = !hasExpenses
      ? t.statistics?.startTracking || "Start tracking to see your statistics"
      : noPeriodData
        ? t.statistics?.tryAnotherPeriod || "Try another period or reset filters"
        : t.statistics?.tryAnotherCategory || "Try another category or reset filters";

    const shouldShowReset =
      selectedCategory !== null || periodOffset !== 0 || Boolean(customRange);

    return (
      <View style={styles.emptyState}>
        <HugeiconsIcon
          icon={PieChartIcon}
          size={64}
          color={colors.outline}
          strokeWidth={1}
        />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyDescription}>{description}</Text>
        {shouldShowReset ? (
          <Pressable
            haptic="medium"
            onPress={handleResetFilters}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.pressedScale,
            ]}
          >
            <Text style={styles.resetButtonText}>
              {t.statistics?.resetFilters || "Reset filters"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }, [
    colors.outline,
    expenses.length,
    filteredSortedExpenses.length,
    handleResetFilters,
    customRange,
    periodExpenses.length,
    periodOffset,
    selectedCategory,
    t.statistics,
  ]);

  const renderCategoryPill = useCallback(
    ({ item }: { item: CategoryPillItemType }) => (
      <CategoryPill
        item={item}
        isSelected={selectedCategory === item.category}
        onPress={() => setSelectedCategory(item.category)}
        t={t}
      />
    ),
    [selectedCategory, t],
  );

  const listHeader = useMemo(
    () => (
      <View>
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryAmount} numberOfLines={1}>
                {periodAmountLabel}
              </Text>
              <Text style={styles.summaryCount}>{periodItemLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.dateNavigationSection}>
          <Pressable
            haptic="light"
            onPress={handlePreviousPeriod}
            style={({ pressed }) => [
              styles.monthNavButton,
              pressed && styles.pressedScale,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Previous date range"
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              size={24}
              color="#2D3748"
              strokeWidth={2.2}
            />
          </Pressable>

          <Pressable
            haptic="medium"
            onPress={openMonthRangeModal}
            style={({ pressed }) => [
              styles.monthLabelPill,
              pressed && styles.pressedScale,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t.statistics?.customRange || "Select custom month range"}
          >
            <HugeiconsIcon
              icon={Calendar03Icon}
              size={16}
              color="#4A4A4A"
              strokeWidth={2}
            />
            <Text style={styles.monthLabelText}>{periodLabel}</Text>
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={16}
              color="#6B7280"
              strokeWidth={2}
            />
          </Pressable>

          <Pressable
            haptic="light"
            onPress={handleNextPeriod}
            disabled={isNextDisabled}
            style={({ pressed }) => [
              styles.monthNavButton,
              isNextDisabled && styles.monthNavButtonDisabled,
              pressed && !isNextDisabled && styles.pressedScale,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Next date range"
          >
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={24}
              color={isNextDisabled ? "#9CA3AF" : "#2D3748"}
              strokeWidth={2.2}
            />
          </Pressable>
        </View>

        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>{t.statistics?.byCategory || "By Category"}</Text>

          {periodCategoryBreakdown.length > 0 ? (
            <FlashList
              data={categoryPills}
              horizontal
              keyExtractor={(item) => item.key}
              {...{ estimatedItemSize: 100 }}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPillsRow}
              renderItem={renderCategoryPill}
            />
          ) : (
            <Text style={styles.noCategoryDataText}>
              {t.statistics?.noPeriodData || "No expenses in this period"}
            </Text>
          )}

          {selectedCategoryBreakdown ? (
            <Text style={styles.categoryMetaText}>
              {formatNumber(Math.round(selectedCategoryBreakdown.percentage))}% -{" "}
              {formatNumber(selectedCategoryBreakdown.count)}{" "}
              {selectedCategoryBreakdown.count === 1 ? t.common.item : t.common.items}
            </Text>
          ) : null}
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>{t.statistics?.history || "History"}</Text>
        </View>
      </View>
    ),
    [
      categoryPills,
      formatNumber,
      handleNextPeriod,
      isNextDisabled,
      handlePreviousPeriod,
      openMonthRangeModal,
      periodAmountLabel,
      periodCategoryBreakdown.length,
      periodItemLabel,
      periodLabel,
      renderCategoryPill,
      selectedCategoryBreakdown,
      t,
    ],
  );

  const pageTransitionStyle = usePageTransition();

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Animated.View style={[styles.screenTransition, pageTransitionStyle]}>
        <View style={[styles.contentFrame, { maxWidth: maxContentWidth }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t.statistics?.title || "Statistics"}</Text>
          </View>

          <FlashList
            data={historyListItems}
            keyExtractor={(item) => item.id}
            renderItem={renderHistoryItem}
            {...{ estimatedItemSize: 80 }}
            getItemType={(item) => item.type}
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingHorizontal: horizontalPadding },
            ]}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={<View style={styles.bottomSpacer} />}
          />
        </View>

        <Modal
          transparent
          visible={showMonthRangeModal}
          animationType="fade"
          onRequestClose={closeMonthRangeModal}
        >
          <Pressable
            haptic="none"
            style={styles.monthRangeModalOverlay}
            onPress={closeMonthRangeModal}
          >
            <Pressable
              haptic="none"
              style={styles.monthRangeModalCard}
              onPress={(event) => event.stopPropagation()}
            >
              <Text style={styles.monthRangeModalTitle}>
                {t.statistics?.customRange || "Custom month range"}
              </Text>

              <Text style={styles.monthRangeSectionLabel}>
                {t.statistics?.startMonth || "Start month"}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.monthOptionRow}
              >
                {monthOptions.map((option) => {
                  const isSelected = compareMonth(option.value, pickerStartMonth) === 0;
                  const isDisabled = compareMonth(option.value, pickerEndMonth) > 0;

                  return (
                    <Pressable
                      haptic="light"
                      key={`start-${option.key}`}
                      onPress={() => {
                        setPickerStartMonth(option.value);
                        if (compareMonth(option.value, pickerEndMonth) > 0) {
                          setPickerEndMonth(option.value);
                        }
                      }}
                      disabled={isDisabled}
                      style={({ pressed }) => [
                        styles.monthOptionPill,
                        isSelected && styles.monthOptionPillActive,
                        isDisabled && styles.monthOptionPillDisabled,
                        pressed && !isDisabled && styles.pressedScale,
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthOptionText,
                          isSelected && styles.monthOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.monthRangeSectionLabel}>
                {t.statistics?.endMonth || "End month"}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.monthOptionRow}
              >
                {monthOptions.map((option) => {
                  const isSelected = compareMonth(option.value, pickerEndMonth) === 0;
                  const isDisabled = compareMonth(option.value, pickerStartMonth) < 0;

                  return (
                    <Pressable
                      haptic="light"
                      key={`end-${option.key}`}
                      onPress={() => setPickerEndMonth(option.value)}
                      disabled={isDisabled}
                      style={({ pressed }) => [
                        styles.monthOptionPill,
                        isSelected && styles.monthOptionPillActive,
                        isDisabled && styles.monthOptionPillDisabled,
                        pressed && !isDisabled && styles.pressedScale,
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthOptionText,
                          isSelected && styles.monthOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.monthRangeActions}>
                <Pressable
                  haptic="medium"
                  onPress={closeMonthRangeModal}
                  style={({ pressed }) => [
                    styles.monthRangeCancelButton,
                    pressed && styles.pressedScale,
                  ]}
                >
                  <Text style={styles.monthRangeCancelText}>{t.form.cancel}</Text>
                </Pressable>

                <Pressable
                  haptic="heavy"
                  onPress={handleApplyMonthRange}
                  style={({ pressed }) => [
                    styles.monthRangeApplyButton,
                    pressed && styles.pressedScale,
                  ]}
                >
                  <Text style={styles.monthRangeApplyText}>
                    {t.statistics?.applyRange || "Apply"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {selectedExpense && (
          <ActionMenuModal
            visible={showActionMenu}
            onClose={() => setShowActionMenu(false)}
            actions={actionMenuItems}
            itemTitle={selectedExpense.description || selectedExpense.category}
          />
        )}
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
  contentFrame: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
    color: "#1A1A1A",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  summarySection: {
    marginBottom: 12,
  },
  summaryCard: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: "#E8F0F5",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryContent: {
    alignItems: "center",
  },
  summaryAmount: {
    fontSize: 42,
    fontWeight: "800",
    color: "#1A1A1A",
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  summaryCount: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
    lineHeight: 20,
    marginTop: 6,
  },
  dateNavigationSection: {
    minHeight: 48,
    marginTop: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavButtonDisabled: {
    opacity: 0.45,
  },
  monthLabelPill: {
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabelText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 21,
    color: "#4A4A4A",
    marginHorizontal: 6,
  },
  categorySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 12,
    lineHeight: 24,
    color: "#000000",
  },
  categoryPillsRow: {
    paddingRight: 8,
  },
  categoryPill: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 999,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    justifyContent: "center",
  },
  categoryPillActive: {
    borderColor: "#10B981",
    backgroundColor: "#10B981",
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    color: "#374151",
  },
  categoryPillTextActive: {
    color: "#FFFFFF",
  },
  noCategoryDataText: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    color: "#6B7280",
  },
  categoryMetaText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    color: "#6B7280",
  },
  historySection: {
    marginBottom: 8,
  },
  todaySeparatorLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  dateGroupTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 12,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  dateGroupTitleBangla: {
    textTransform: "none",
    letterSpacing: 0,
    lineHeight: 16,
  },
  sectionFooter: {
    height: 6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 25,
    color: "#1A1A1A",
  },
  emptyDescription: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 20,
    color: "#6B7280",
  },
  monthRangeModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.38)",
    justifyContent: "flex-end",
  },
  monthRangeModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "72%",
  },
  monthRangeModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    color: "#111827",
    marginBottom: 12,
  },
  monthRangeSectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
    color: "#4B5563",
    marginBottom: 8,
  },
  monthOptionRow: {
    paddingBottom: 16,
    paddingRight: 8,
  },
  monthOptionPill: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginRight: 8,
  },
  monthOptionPillActive: {
    borderColor: "#10B981",
    backgroundColor: "#10B981",
  },
  monthOptionPillDisabled: {
    opacity: 0.4,
  },
  monthOptionText: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 17,
    color: "#374151",
  },
  monthOptionTextActive: {
    color: "#FFFFFF",
  },
  monthRangeActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  monthRangeCancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  monthRangeCancelText: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    color: "#4B5563",
  },
  monthRangeApplyButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  monthRangeApplyText: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    color: "#FFFFFF",
  },
  resetButton: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: "#10B981",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  pressedScale: {
    transform: [{ scale: 0.95 }],
  },
  bottomSpacer: {
    height: 40,
  },
});
