import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import {
  VoiceParsedExpense,
  VoiceParsedGrocery,
  VoiceParsedResult,
} from "@/services/ai/gemini";
import { TranslationKey } from "@/services/i18n";
import { UserSettings } from "@/types";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface VoiceReviewSectionProps {
  parsedResult: VoiceParsedResult;
  settings: UserSettings;
  t: TranslationKey;
  formatNumber: (value: number | string) => string;
  colors: (typeof Colors)["light"];
  onEditExpense: (index: number, item: VoiceParsedExpense) => void;
  onEditGrocery: (index: number, item: VoiceParsedGrocery) => void;
  onTryAgain: () => void;
  onConfirm: () => void;
}

export const VoiceReviewSection: React.FC<VoiceReviewSectionProps> = ({
  parsedResult,
  settings,
  t,
  formatNumber,
  colors,
  onEditExpense,
  onEditGrocery,
  onTryAgain,
  onConfirm,
}) => {
  return (
    <View>
      <View style={styles.reviewHeader}>
        <Text style={[styles.reviewTitle, { color: colors.text }]}>
          {t.voice.review}
        </Text>
        <Text
          style={[
            styles.reviewHint,
            { color: colors.textSecondary },
          ]}
        >
          {t.voice.reviewHint}
        </Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t.voice.expenses}
        </Text>
        {parsedResult.expenses.length === 0 ? (
          <Text
            style={[
              styles.emptyText,
              { color: colors.textSecondary },
            ]}
          >
            {t.voice.emptyExpenses}
          </Text>
        ) : (
          parsedResult.expenses.map((expense, index) => (
            <Pressable
              key={`${(expense as { id?: string }).id ?? `${expense.description}-${expense.amount}-${expense.category || "other"}`}-${index}`}
              onPress={() => onEditExpense(index, expense)}
              style={[
                styles.reviewCard,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.outline,
                },
              ]}
            >
              <View style={styles.reviewRow}>
                <Text
                  style={[styles.reviewMain, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {expense.description}
                </Text>
                <Text
                  style={[
                    styles.reviewAmount,
                    { color: colors.text },
                  ]}
                >
                  {settings.currency.symbol}
                  {formatNumber(expense.amount)}
                </Text>
              </View>
              <Text
                style={[
                  styles.reviewMeta,
                  { color: colors.textSecondary },
                ]}
              >
                {t.categories[
                  (expense.category || "other") as keyof typeof t.categories
                ]}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.reviewSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t.voice.groceries}
        </Text>
        {parsedResult.groceries.length === 0 ? (
          <Text
            style={[
              styles.emptyText,
              { color: colors.textSecondary },
            ]}
          >
            {t.voice.emptyGroceries}
          </Text>
        ) : (
          parsedResult.groceries.map((item, index) => (
            <Pressable
              key={`${item.name}-${item.quantity || ""}-${item.price ?? ""}-${item.category || "other"}-${index}`}
              onPress={() => onEditGrocery(index, item)}
              style={[
                styles.reviewCard,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.outline,
                },
              ]}
            >
              <View style={styles.reviewRow}>
                <Text
                  style={[styles.reviewMain, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.reviewAmount,
                    { color: colors.text },
                  ]}
                >
                  {item.price !== undefined
                    ? `${settings.currency.symbol}${formatNumber(item.price)}`
                    : "-"}
                </Text>
              </View>
              <Text
                style={[
                  styles.reviewMeta,
                  { color: colors.textSecondary },
                ]}
              >
                {(item.quantity ? `${item.quantity} • ` : "") +
                  t.categories[
                    (item.category || "other") as keyof typeof t.categories
                  ]}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.reviewActions}>
        <Pressable
          onPress={onTryAgain}
          style={[
            styles.secondaryButton,
            { borderColor: colors.outline },
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            {t.voice.tryAgain}
          </Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary, flex: 1, marginTop: 0 },
          ]}
        >
          <HugeiconsIcon
            icon={Tick02Icon}
            size={20}
            color={colors.onPrimary}
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.primaryButtonText,
              { color: colors.onPrimary },
            ]}
          >
            {t.voice.confirmAdd}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  primaryButton: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  reviewHeader: {
    marginTop: 20,
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  reviewHint: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  reviewSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 18,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  reviewMain: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
  },
  reviewAmount: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  reviewMeta: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  reviewActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
});
