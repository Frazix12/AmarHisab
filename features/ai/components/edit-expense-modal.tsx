import { BanglaNumberInput } from "@/components/shared/bangla-number-input";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import { useI18n, useSettingsDomain, useTheme } from "@/contexts/app-selectors";
import { VoiceParsedExpense } from "@/services/ai/gemini";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "@/types";
import { triggerLightHaptic } from "@/utils/haptics";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useEffect, useRef } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Controller, useForm } from "react-hook-form";

interface EditExpenseModalProps {
  visible: boolean;
  item: VoiceParsedExpense | null;
  onClose: () => void;
  onSave: (item: VoiceParsedExpense) => void;
}

interface EditExpenseModalFormValues {
  amount: string;
  description: string;
  category: ExpenseCategory;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  visible,
  item,
  onClose,
  onSave,
}) => {
  const colorScheme = useTheme();
  const { t } = useI18n();
  const { settings } = useSettingsDomain();
  const colors = Colors[colorScheme];
  const amountInputRef = useRef<TextInput | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditExpenseModalFormValues>({
    defaultValues: {
      amount: "",
      description: "",
      category: "other",
    },
  });

  const amount = watch("amount");
  const category = watch("category");
  const parsedAmount = Number.parseFloat(amount);
  const isAmountValid = !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const isSaveDisabled = !isAmountValid;
  const displayAmountError =
    errors.amount?.message ||
    (!isAmountValid && amount.trim() ? t.alerts.invalidAmount : null);

  useEffect(() => {
    if (!visible || !item) return;
    reset({
      amount: item.amount.toString(),
      description: item.description,
      category: item.category || "other",
    });
  }, [visible, item, reset]);

  const handleSave = handleSubmit(
    (values) => {
      const nextAmount = Number.parseFloat(values.amount);
      if (Number.isNaN(nextAmount) || nextAmount <= 0) {
        return;
      }

      onSave({
        amount: nextAmount,
        description: values.description.trim() || item?.description || "",
        category: values.category,
      });
    },
    () => {
      amountInputRef.current?.focus();
    },
  );

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.editOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.editContainer}
        >
          <View style={[styles.editCard, { backgroundColor: colors.surface }]}>
            <View style={styles.editHeader}>
              <Text style={[styles.editTitle, { color: colors.text }]}>
                {t.expenses.editExpense}
              </Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={20}
                  color={colors.text}
                  strokeWidth={2}
                />
              </Pressable>
            </View>

            <View style={styles.editBody}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {t.form.amount} ({settings.currency.symbol})
              </Text>
              <Controller
                control={control}
                name="amount"
                rules={{
                  validate: (value) => {
                    const parsed = Number.parseFloat(value);
                    if (Number.isNaN(parsed) || parsed <= 0) {
                      return t.alerts.invalidAmount;
                    }
                    return true;
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <BanglaNumberInput
                    ref={amountInputRef}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceVariant,
                        borderColor: colors.outline,
                        color: colors.text,
                      },
                    ]}
                    value={value}
                    onChangeText={onChange}
                    isBanglaMode={settings.language === "bn"}
                  />
                )}
              />
              {displayAmountError ? (
                <Text style={[styles.inputErrorText, { color: colors.error }]}>
                  {displayAmountError}
                </Text>
              ) : null}

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {t.form.description}
              </Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      {
                        backgroundColor: colors.surfaceVariant,
                        borderColor: colors.outline,
                        color: colors.text,
                      },
                    ]}
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => triggerLightHaptic()}
                    multiline
                    numberOfLines={3}
                  />
                )}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {t.form.category}
              </Text>
              <View style={styles.categoryGrid}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.value}
                    onPress={() => setValue("category", cat.value)}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor:
                          category === cat.value
                            ? colors.primaryContainer
                            : colors.surfaceVariant,
                        borderColor:
                          category === cat.value
                            ? colors.primary
                            : colors.outline,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color:
                            category === cat.value
                              ? colors.primary
                              : colors.text,
                        },
                      ]}
                    >
                      {t.categories[cat.value as keyof typeof t.categories]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.editActions}>
              <Pressable
                onPress={onClose}
                style={[styles.secondaryButton, { borderColor: colors.outline }]}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  {t.form.cancel}
                </Text>
              </Pressable>
              <Pressable
                disabled={isSaveDisabled}
                onPress={handleSave}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    flex: 1,
                    marginTop: 0,
                    opacity: isSaveDisabled ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={[styles.primaryButtonText, { color: colors.onPrimary }]}
                >
                  {t.form.save}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  editOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  editContainer: {
    width: "100%",
  },
  editCard: {
    borderRadius: 16,
    padding: 18,
  },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  editTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  editBody: {
    gap: 12,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    lineHeight: 20,
  },
  inputErrorText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
    fontWeight: "600",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
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
});
