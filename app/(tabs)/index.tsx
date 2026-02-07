import {
  ActionMenuItem,
  ActionMenuModal,
} from "@/components/shared/action-menu-modal";
import { OnboardingTip } from "@/components/shared/onboarding-tip";
import { SummaryCard } from "@/components/shared/summary-card";
import { showToast, Toast } from "@/components/ui/toast";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { AddExpenseModal } from "@/features/expenses/components/add-expense-modal";
import { EditExpenseModal } from "@/features/expenses/components/edit-expense-modal";
import { ExpenseCard } from "@/features/expenses/components/expense-card";
import { Expense } from "@/types";
import { useMorphingFabAnimation, usePageTransition } from "@/utils/animations";
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
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const FAB_SIZE = 60;
const FAB_RIGHT = 20;
const FAB_BOTTOM = 20;
const ADD_MODAL_HEIGHT_RATIO = 0.82;
const FAB_TO_CLOSE_X = -8;
const FAB_CLOSE_CENTER_Y = 44;
const SCREEN_HEIGHT = Dimensions.get("screen").height;

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
  const insets = useSafeAreaInsets();

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
    setModalVisible((prev) => !prev);
  }, []);

  const fabStartCenterY = SCREEN_HEIGHT - insets.bottom - FAB_BOTTOM - FAB_SIZE / 2;
  const fabTargetCenterY =
    SCREEN_HEIGHT * (1 - ADD_MODAL_HEIGHT_RATIO) + FAB_CLOSE_CENTER_Y;
  const fabTravelY = fabTargetCenterY - fabStartCenterY;
  const { fabStyle, iconStyle } = useMorphingFabAnimation(modalVisible, {
    travelY: fabTravelY,
    travelX: FAB_TO_CLOSE_X,
    activeScale: 0.8,
  });

  const handleExpensePress = useCallback((expense: Expense) => {
    // TODO: Open edit expense modal
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
  const pageTransitionStyle = usePageTransition();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Animated.View style={[styles.screenTransition, pageTransitionStyle]}>
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

      {/* Add Expense Modal */}
      <AddExpenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        fabConfig={{
          fabSize: FAB_SIZE,
          fabRight: FAB_RIGHT,
          fabBottom: FAB_BOTTOM,
          modalHeightRatio: ADD_MODAL_HEIGHT_RATIO,
        }}
      />

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fab,
          {
            backgroundColor: modalVisible ? colors.error : colors.primary,
            shadowColor: modalVisible ? colors.error : colors.shadow,
          },
          fabStyle,
        ]}
      >
        <Pressable
          onPress={handleAddExpense}
          style={({ pressed }) => [
            styles.fabPressable,
            {
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            modalVisible
              ? t.form.cancel || "Close add expense"
              : t.expenses.addExpense
          }
        >
          <Animated.View style={iconStyle}>
            <HugeiconsIcon
              icon={Add01Icon}
              size={28}
              color={colors.onPrimary}
              strokeWidth={2.5}
            />
          </Animated.View>
        </Pressable>
      </Animated.View>

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
