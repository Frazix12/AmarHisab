import { Colors } from "@/constants/theme";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { AppImage } from "@/components/ui/app-image";
import { TranslationKey } from "@/services/i18n";
import { Expense, UserSettings } from "@/types";
import { withAlpha } from "@/utils/color";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/date";
import {
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useCallback, useRef, useState } from "react";
import {
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
  showCategory?: boolean;
  variant?: "default" | "statistics";
  onPress?: (expense: Expense) => void;
  onLongPress?: (expense: Expense) => void;
}

const getCategoryVisual = (category: string) => {
  const visuals: Record<string, { emoji: string; backgroundColor: string }> = {
    food: { emoji: "🍜", backgroundColor: "#FFE2C7" },
    transport: { emoji: "🚕", backgroundColor: "#DCE9FF" },
    shopping: { emoji: "🛍️", backgroundColor: "#FCDCF3" },
    entertainment: { emoji: "🎬", backgroundColor: "#E8DEFF" },
    healthcare: { emoji: "🩺", backgroundColor: "#FFD9DE" },
    bills: { emoji: "🧾", backgroundColor: "#FFF1C9" },
    education: { emoji: "📚", backgroundColor: "#D8F4E6" },
    other: { emoji: "✨", backgroundColor: "#E7E7ED" },
  };
  return visuals[category] || visuals.other;
};

export const ExpenseCard = React.memo(
  ({
    expense,
    colors,
    settings,
    t,
    showCategory = true,
    variant = "default",
    onPress,
    onLongPress,
  }: ExpenseCardProps) => {
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const thumbnailPressedRef = useRef(false);
    const categoryVisual = getCategoryVisual(expense.category);
    const categoryLabel = Object.prototype.hasOwnProperty.call(
      t.categories,
      expense.category,
    )
      ? t.categories[expense.category as keyof typeof t.categories]
      : expense.category || t.categories.other || "Unknown";
    const isStatisticsVariant = variant === "statistics";
    const nameLabel = expense.description?.trim() || t.form.item;
    const handlePress = useCallback(() => {
      if (thumbnailPressedRef.current || !onPress) return;
      onPress(expense);
    }, [expense, onPress]);
    const handleLongPress = onLongPress ? () => onLongPress(expense) : undefined;
    const handleThumbnailPressIn = useCallback(() => {
      thumbnailPressedRef.current = true;
    }, []);
    const handleThumbnailPressOut = useCallback(() => {
      requestAnimationFrame(() => {
        thumbnailPressedRef.current = false;
      });
    }, []);
    const handleThumbnailPress = useCallback(() => {
      thumbnailPressedRef.current = true;
      setIsImageViewerVisible(true);
    }, []);
    const closeImageViewer = useCallback(() => {
      thumbnailPressedRef.current = false;
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
            isStatisticsVariant && styles.statisticsContainer,
            {
              backgroundColor: colors.surface,
              borderColor: isStatisticsVariant ? "#F3F4F6" : colors.outline,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: expense.imageUri
                  ? "transparent"
                  : categoryVisual.backgroundColor,
              },
            ]}
          >
            {expense.imageUri ? (
              <Pressable
                onPressIn={handleThumbnailPressIn}
                onPressOut={handleThumbnailPressOut}
                onPress={handleThumbnailPress}
                accessibilityRole="button"
                accessibilityLabel={t.form.attachment || "View attached image"}
              >
                <AppImage
                  uri={expense.imageUri}
                  style={styles.thumbnailImage}
                  contentFit="cover"
                />
              </Pressable>
            ) : (
              <Text style={styles.categoryEmoji}>{categoryVisual.emoji}</Text>
            )}
          </View>

          <View style={styles.content}>
            <Text
              style={[styles.category, { color: colors.text }]}
              numberOfLines={1}
            >
              {showCategory ? categoryLabel : nameLabel}
            </Text>
            {showCategory && expense.description ? (
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
            {isStatisticsVariant ? (
              <Text style={[styles.statisticsAmount, { color: colors.error }]}> 
                {formatCurrency(expense.amount, settings.currency, settings.language)}
              </Text>
            ) : (
              <View
                style={[
                  styles.amountPill,
                  {
                    backgroundColor: withAlpha(colors.error, 0.1),
                  },
                ]}
              >
                <Text style={[styles.amount, { color: colors.error }]}> 
                  {formatCurrency(expense.amount, settings.currency, settings.language)}
                </Text>
              </View>
            )}
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
                <AppImage
                  uri={expense.imageUri}
                  style={styles.viewerImage}
                  contentFit="contain"
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
  statisticsContainer: {
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 22,
    lineHeight: 26,
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
  amountPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  amount: {
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 22,
  },
  statisticsAmount: {
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 24,
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
    height: "100%",
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
