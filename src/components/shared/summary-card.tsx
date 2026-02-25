import { Colors } from "@/constants/theme";
import { useI18n, useSettingsDomain, useTheme } from "@/contexts/app-selectors";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface SummaryCardProps {
  icon: any;
  title: string;
  amount: number;
  variant?: "primary" | "secondary" | "success";
  description?: string;
  size?: "default" | "large";
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  title,
  amount,
  variant = "primary",
  description,
  size = "default",
}) => {
  const colorScheme = useTheme();
  const { formatNumber } = useI18n();
  const { settings } = useSettingsDomain();
  const colors = Colors[colorScheme];

  const getVariantColors = () => {
    switch (variant) {
      case "primary":
        return {
          bg: colors.primaryContainer,
          iconColor: colors.primary,
          textColor: colors.onPrimaryContainer,
        };
      case "secondary":
        return {
          bg: colors.secondaryContainer,
          iconColor: colors.secondary,
          textColor: colors.onSecondaryContainer,
        };
      case "success":
        return {
          bg: colors.successContainer,
          iconColor: colors.success,
          textColor: colors.text,
        };
      default:
        return {
          bg: colors.primaryContainer,
          iconColor: colors.primary,
          textColor: colors.onPrimaryContainer,
        };
    }
  };

  const variantColors = getVariantColors();

  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const displayAmount = formatNumber(formattedAmount);

  return (
    <View
      style={[
        styles.container,
        size === "large" && styles.containerLarge,
        { backgroundColor: variantColors.bg },
      ]}
    >
      <View style={styles.iconContainer}>
        <HugeiconsIcon
          icon={icon}
          size={24}
          color={variantColors.iconColor}
          strokeWidth={1.5}
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: variantColors.textColor }]}>
          {title}
        </Text>
        <Text
          style={[
            styles.amount,
            size === "large" && styles.amountLarge,
            { color: variantColors.textColor },
          ]}
        >
          {settings.currency.symbol}
          {displayAmount}
        </Text>
        {description ? (
          <Text style={[styles.description, { color: variantColors.textColor }]}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  containerLarge: {
    paddingVertical: 20,
    paddingHorizontal: 18,
    minHeight: 128,
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    lineHeight: 18,
  },
  amount: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  amountLarge: {
    fontSize: 28,
    lineHeight: 34,
  },
  description: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.78,
  },
});
