import {
    ActionMenuItem,
    ActionMenuModal,
} from "@/components/shared/action-menu-modal";
import { OnboardingTip } from "@/components/shared/onboarding-tip";
import { showToast, Toast } from "@/components/ui/toast";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { AddGroceryModal } from "@/features/grocery/components/add-grocery-modal";
import { CompleteGroceryModal } from "@/features/grocery/components/complete-grocery-modal";
import { EditGroceryModal } from "@/features/grocery/components/edit-grocery-modal";
import { GroceryItemComponent } from "@/features/grocery/components/grocery-item";
import { TemplateSuggestionCard } from "@/features/templates/components/template-suggestion-card";
import { GroceryCategory, GroceryItem } from "@/types";
import { LearningCandidate } from "@/types/template";
import { usePageTransition } from "@/utils/animations";
import {
    Add01Icon,
    Delete02Icon,
    Edit02Icon,
    ShoppingBasket01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const GROCERY_CATEGORY_ORDER: GroceryCategory[] = [
  "vegetables",
  "fruits",
  "dairy",
  "meat",
  "snacks",
  "beverages",
  "household",
  "other",
];

interface GrocerySection {
  title: GroceryCategory;
  data: GroceryItem[];
}

export default function GroceryScreen() {
  const {
    groceryItems,
    toggleGroceryItem,
    deleteGroceryItem,
    clearCompletedGroceryItems,
    itemPendingCompletion,
    setItemPendingCompletion,
    completeGroceryItem,
    colorScheme,
    t,
    settings,
    formatNumber,
    checkForSuggestions,
    acceptSuggestion,
    dismissSuggestion,
    smartSuggestionsEnabled,
  } = useApp();
  const colors = Colors[colorScheme];
  const isBangla = settings.language === "bn";
  const [modalVisible, setModalVisible] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] =
    useState<LearningCandidate | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GroceryItem | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Check for suggestions after adding an item
  useEffect(() => {
    let isActive = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const checkSuggestions = async () => {
      if (!isActive || !smartSuggestionsEnabled || modalVisible) return;

      const suggestion = await checkForSuggestions();
      if (!isActive) return;

      if (suggestion) {
        setCurrentSuggestion(suggestion);
        setShowSuggestion(true);
      }
    };

    // Small delay to let modal close animation finish
    if (!modalVisible) {
      timeoutId = setTimeout(() => {
        void checkSuggestions();
      }, 500);
    }

    return () => {
      isActive = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [modalVisible, smartSuggestionsEnabled, checkForSuggestions]);

  const sections = useMemo<GrocerySection[]>(() => {
    if (groceryItems.length === 0) return [];

    const grouped = new Map<GroceryCategory, GroceryItem[]>();
    for (const item of groceryItems) {
      const group = grouped.get(item.category);
      if (group) {
        group.push(item);
      } else {
        grouped.set(item.category, [item]);
      }
    }

    return GROCERY_CATEGORY_ORDER.flatMap((category) => {
      const items = grouped.get(category);
      if (!items || items.length === 0) return [];
      return [{ title: category, data: items }];
    });
  }, [groceryItems]);

  const hasCompletedItems = useMemo(
    () => groceryItems.some((item) => item.checked),
    [groceryItems],
  );

  const handleAddItem = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleToggleItem = useCallback(
    (itemId: string) => {
      toggleGroceryItem(itemId);
    },
    [toggleGroceryItem],
  );

  const handleItemLongPress = useCallback((item: GroceryItem) => {
    // Haptic feedback on Android
    if (Platform.OS === "android") {
      Vibration.vibrate(50);
    }
    setSelectedItem(item);
    setShowActionMenu(true);
  }, []);

  const handleEdit = useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!selectedItem) return;

    Alert.alert(
      t.grocery.deleteItem,
      t.alerts.deleteItemMessage,
      [
        { text: t.form.cancel, style: "cancel" },
        {
          text: t.modal.delete,
          style: "destructive",
          onPress: () => {
            deleteGroceryItem(selectedItem.id);
            showToast(t.grocery.itemDeleted || "Item deleted");
          },
        },
      ],
      { cancelable: true },
    );
  }, [deleteGroceryItem, selectedItem, t]);

  const handleEditSave = useCallback(() => {
    showToast(t.grocery.itemUpdated || "Item updated ✓");
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

  const handleClearCompleted = useCallback(() => {
    Alert.alert(
      t.grocery.clearCompleted,
      t.alerts.clearCompletedMessage,
      [
        { text: t.form.cancel, style: "cancel" },
        {
          text: t.modal.delete,
          style: "destructive",
          onPress: clearCompletedGroceryItems,
        },
      ],
      { cancelable: true },
    );
  }, [clearCompletedGroceryItems, t]);

  const handleSaveSuggestion = useCallback(async () => {
    if (!currentSuggestion) return;
    await acceptSuggestion(currentSuggestion);
    setShowSuggestion(false);
  }, [acceptSuggestion, currentSuggestion]);

  const handleDismissSuggestion = useCallback(
    async (forever: boolean) => {
      if (!currentSuggestion) return;
      await dismissSuggestion(currentSuggestion.productNameNormalized, forever);
      setShowSuggestion(false);
      setCurrentSuggestion(null);
    },
    [currentSuggestion, dismissSuggestion],
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyState}>
        <HugeiconsIcon
          icon={ShoppingBasket01Icon}
          size={64}
          color={colors.outline}
          strokeWidth={1}
        />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t.grocery.noItems}
        </Text>
        <Text
          style={[styles.emptyDescription, { color: colors.textSecondary }]}
        >
          {t.grocery.addFirst}
        </Text>
      </View>
    ),
    [colors, t],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: GrocerySection }) => (
      <Text
        style={[
          styles.categoryTitle,
          { color: colors.textSecondary },
          isBangla && styles.categoryTitleBangla,
        ]}
      >
        {t.categories[section.title as keyof typeof t.categories]}
      </Text>
    ),
    [colors, isBangla, t],
  );

  const renderSectionFooter = useCallback(
    () => <View style={styles.sectionFooter} />,
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: GroceryItem }) => (
      <GroceryItemComponent
        item={item}
        colors={colors}
        t={t}
        settings={settings}
        formatNumber={formatNumber}
        onToggle={handleToggleItem}
        onLongPress={handleItemLongPress}
      />
    ),
    [
      colors,
      formatNumber,
      handleItemLongPress,
      handleToggleItem,
      settings,
      t,
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
          {t.grocery.title}
        </Text>
        {hasCompletedItems && (
          <Pressable
            onPress={handleClearCompleted}
            style={({ pressed }) => [
              styles.clearButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text
              style={[
                styles.clearButtonText,
                isBangla && styles.clearButtonTextBangla,
                { color: colors.error },
              ]}
            >
              {t.grocery.clearCompleted}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Onboarding Tip */}
      <OnboardingTip screenKey="grocery" />

      {/* Suggestion Card */}
      {currentSuggestion && (
        <TemplateSuggestionCard
          suggestion={currentSuggestion}
          onSave={handleSaveSuggestion}
          onDismiss={handleDismissSuggestion}
          visible={showSuggestion}
        />
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={<View style={styles.bottomSpacer} />}
        stickySectionHeadersEnabled={false}
      />

      {/* Floating Action Button */}
      <Pressable
        onPress={handleAddItem}
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

      {/* Add Grocery Modal */}
      <AddGroceryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />

      {/* Complete Grocery Modal */}
      <CompleteGroceryModal
        visible={itemPendingCompletion !== null}
        item={itemPendingCompletion}
        onClose={() => setItemPendingCompletion(null)}
        onComplete={(price, imageUri) => {
          if (itemPendingCompletion) {
            completeGroceryItem(itemPendingCompletion.id, price, imageUri);
          }
        }}
      />

      {/* Action Menu */}
      {selectedItem && (
        <ActionMenuModal
          visible={showActionMenu}
          onClose={() => setShowActionMenu(false)}
          actions={actionMenuItems}
          itemTitle={selectedItem.name}
        />
      )}

      {/* Edit Grocery Modal */}
      {selectedItem && (
        <EditGroceryModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          item={selectedItem}
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
    flexShrink: 1,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
    flexShrink: 1,
    alignItems: "flex-end",
    maxWidth: "58%",
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  clearButtonTextBangla: {
    fontWeight: "500",
    lineHeight: 22,
    includeFontPadding: true,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
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
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  categoryTitleBangla: {
    textTransform: "none",
    letterSpacing: 0,
    lineHeight: 18,
  },
  sectionFooter: {
    height: 24,
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
