import { Colors } from "@/constants/theme";
import { TranslationKey } from "@/services/i18n";
import { GroceryItem, UserSettings } from "@/types";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type ThemeColors = typeof Colors.light;

interface GroceryItemComponentProps {
  item: GroceryItem;
  colors: ThemeColors;
  t: TranslationKey;
  settings: UserSettings;
  formatNumber: (value: number | string) => string;
  onToggle?: (itemId: string) => void;
  onPress?: (item: GroceryItem) => void;
  onLongPress?: (item: GroceryItem) => void;
}

export const GroceryItemComponent = React.memo(
  ({
    item,
    colors,
    t,
    settings,
    formatNumber,
    onToggle,
    onPress,
    onLongPress,
  }: GroceryItemComponentProps) => {
    const handlePress = onToggle
      ? () => onToggle(item.id)
      : onPress
        ? () => onPress(item)
        : undefined;
    const handleToggle = onToggle ? () => onToggle(item.id) : undefined;
    const handleLongPress = onLongPress ? () => onLongPress(item) : undefined;

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
        <Pressable
          onPress={handleToggle}
          style={[
            styles.checkbox,
            {
              backgroundColor: item.checked ? colors.primary : colors.surface,
              borderColor: item.checked ? colors.primary : colors.outline,
            },
          ]}
        >
          {item.checked && (
            <HugeiconsIcon
              icon={Tick02Icon}
              size={16}
              color={colors.onPrimary}
              strokeWidth={2.5}
            />
          )}
        </Pressable>

        <View style={styles.content}>
          <Text
            style={[
              styles.name,
              {
                color: item.checked ? colors.textSecondary : colors.text,
                textDecorationLine: item.checked ? "line-through" : "none",
              },
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={styles.metaContainer}>
            {item.quantity ? (
              <Text style={[styles.quantity, { color: colors.textSecondary }]}>
                {formatNumber(item.quantity)}
              </Text>
            ) : null}
            {item.price > 0 ? (
              <Text
                style={[
                  styles.price,
                  { color: colors.primary, fontWeight: "600" },
                ]}
              >
                {settings.currency.symbol}
                {formatNumber(item.price.toFixed(2))}
              </Text>
            ) : (
              <Text
                style={[styles.priceNotSet, { color: colors.textSecondary }]}
              >
                {t.grocery?.priceNotSet || "Price not set"}
              </Text>
            )}
            <Text style={[styles.category, { color: colors.textSecondary }]}>
              {t.categories[item.category as keyof typeof t.categories]}
            </Text>
            {!item.checked && item.price === 0 && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: colors.warning
                      ? colors.warning + "20"
                      : "#F59E0B20",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: colors.warning || "#F59E0B" },
                  ]}
                >
                  {t.grocery?.needsPrice || "Needs price"}
                </Text>
              </View>
            )}
          </View>
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
    lineHeight: 20,
  },
  metaContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    rowGap: 4,
    alignItems: "center",
  },
  quantity: {
    fontSize: 14,
    lineHeight: 18,
  },
  price: {
    fontSize: 14,
    lineHeight: 18,
  },
  category: {
    fontSize: 14,
    lineHeight: 18,
  },
  priceNotSet: {
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
  },
});
