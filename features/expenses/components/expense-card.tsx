import { Colors } from "@/constants/theme";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { TranslationKey } from "@/services/i18n";
import { Expense, UserSettings } from "@/types";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/date";
import {
    Book02Icon,
    Cancel01Icon,
    Car03Icon,
    Film01Icon,
    Invoice01Icon,
    Medicine01Icon,
    MoreHorizontalIcon,
    Restaurant01Icon,
    ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useCallback, useState } from "react";
import {
  GestureResponderEvent,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ThemeColors = typeof Colors.light;

interface ExpenseCardProps {
  expense: Expense;
  colors: ThemeColors;
  settings: UserSettings;
  t: TranslationKey;
  onPress?: (expense: Expense) => void;
  onLongPress?: (expense: Expense) => void;
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, any> = {
    food: Restaurant01Icon,
    transport: Car03Icon,
    shopping: ShoppingBag01Icon,
    entertainment: Film01Icon,
    healthcare: Medicine01Icon,
    bills: Invoice01Icon,
    education: Book02Icon,
    other: MoreHorizontalIcon,
  };
  return icons[category] || MoreHorizontalIcon;
};

export const ExpenseCard = React.memo(
  ({
    expense,
    colors,
    settings,
    t,
    onPress,
    onLongPress,
  }: ExpenseCardProps) => {
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const icon = getCategoryIcon(expense.category);
    const categoryLabel = Object.prototype.hasOwnProperty.call(
      t.categories,
      expense.category,
    )
      ? t.categories[expense.category as keyof typeof t.categories]
      : expense.category || t.categories.other || "Unknown";
    const handlePress = onPress ? () => onPress(expense) : undefined;
    const handleLongPress = onLongPress ? () => onLongPress(expense) : undefined;
    const handleThumbnailPress = useCallback((event: GestureResponderEvent) => {
      event.stopPropagation();
      setIsImageViewerVisible(true);
    }, []);
    const closeImageViewer = useCallback(() => {
      setIsImageViewerVisible(false);
    }, []);

    return (
      <>
        <Pressable
          longPressHaptic="medium"
          onPress={handlePress}
          onLongPress={handleLongPress}
          style={({ pressed }) => [
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.outline,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: expense.imageUri
                  ? "transparent"
                  : colors.primaryContainer,
              },
            ]}
          >
            {expense.imageUri ? (
              <Pressable
                onPress={handleThumbnailPress}
                accessibilityRole="button"
                accessibilityLabel={t.form.attachment || "View attached image"}
              >
                <Image
                  source={{ uri: expense.imageUri }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              </Pressable>
            ) : (
              <HugeiconsIcon
                icon={icon}
                size={24}
                color={colors.primary}
                strokeWidth={1.5}
              />
            )}
          </View>

          <View style={styles.content}>
            <Text
              style={[styles.category, { color: colors.text }]}
              numberOfLines={1}
            >
              {categoryLabel}
            </Text>
            {expense.description ? (
              <Text
                style={[styles.description, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {expense.description}
              </Text>
            ) : null}
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {formatDate(expense.date, settings.language)}
            </Text>
          </View>

          <View style={styles.amountContainer}>
            <Text style={[styles.amount, { color: colors.error }]}>
              {formatCurrency(expense.amount, settings.currency, settings.language)}
            </Text>
          </View>
        </Pressable>

        {expense.imageUri ? (
          <Modal
            visible={isImageViewerVisible}
            transparent
            animationType="fade"
            onRequestClose={closeImageViewer}
          >
            <Pressable haptic="none" style={styles.viewerOverlay} onPress={closeImageViewer}>
              <Pressable
                haptic="none"
                onPress={(event) => event.stopPropagation()}
                style={styles.viewerImageContainer}
              >
                <Image
                  source={{ uri: expense.imageUri }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
              </Pressable>

              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  closeImageViewer();
                }}
                style={styles.viewerCloseButton}
                accessibilityRole="button"
                accessibilityLabel={t.form.cancel || "Close image viewer"}
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={20}
                  color="#EF4444"
                  strokeWidth={2.4}
                />
              </Pressable>
            </Pressable>
          </Modal>
        ) : null}
      </>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  category: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
    lineHeight: 20,
  },
  description: {
    fontSize: 14,
    marginBottom: 2,
    lineHeight: 18,
  },
  date: {
    fontSize: 12,
    lineHeight: 16,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  thumbnailImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  viewerImageContainer: {
    width: "100%",
    height: "82%",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerImage: {
    width: "100%",
    height: "82%",
  },
  viewerCloseButton: {
    position: "absolute",
    top: 48,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
