import { Colors } from "@/constants/theme";
import { TranslationKey } from "@/services/i18n";
import { Expense, UserSettings } from "@/types";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/date";
import {
    Book02Icon,
    Car03Icon,
    Film01Icon,
    Invoice01Icon,
    Medicine01Icon,
    MoreHorizontalIcon,
    Restaurant01Icon,
    ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

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
    const icon = getCategoryIcon(expense.category);
    const handlePress = onPress ? () => onPress(expense) : undefined;
    const handleLongPress = onLongPress ? () => onLongPress(expense) : undefined;

    return (
      <Pressable
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
          <Image
            source={{ uri: expense.imageUri }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
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
          {t.categories[expense.category as keyof typeof t.categories]}
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
});
