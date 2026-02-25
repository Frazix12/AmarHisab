import { BanglaNumberInput } from "@/components/shared/bangla-number-input";
import { CameraModal } from "@/components/camera/camera-modal";
import { AppImage } from "@/components/ui/app-image";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import { useI18n, useSettingsDomain, useTheme } from "@/contexts/app-selectors";
import { detectExpenseCategory } from "@/services/ai/gemini";
import { showNotification } from "@/services/notifications";
import {
  checkRateLimit,
  validateAmount,
  validateDescription,
} from "@/services/validation";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "@/types";
import {
  Calendar03Icon,
  Camera01Icon,
  Cancel01Icon,
  Delete02Icon,
  Image02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export interface ExpenseFormValues {
  amount: string;
  category: ExpenseCategory;
  description: string;
  date: Date;
  imageUri?: string;
}

interface ExpenseFormProps {
  mode: "add" | "edit";
  initialValues?: Partial<ExpenseFormValues>;
  onSubmit: (values: ExpenseFormValues & { aiDetected: boolean }) => void;
  onCancel: () => void;
  title: string;
}

export function ExpenseForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  title,
}: ExpenseFormProps) {
  const colorScheme = useTheme();
  const { t } = useI18n();
  const { settings } = useSettingsDomain();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [aiDetecting, setAiDetecting] = useState(false);
  const [aiDetectedCategory, setAiDetectedCategory] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const initialDetectRef = useRef(false);

  const defaultValues = useMemo<ExpenseFormValues>(
    () => ({
      amount: initialValues?.amount ?? "",
      category: initialValues?.category ?? "food",
      description: initialValues?.description ?? "",
      date: initialValues?.date ?? new Date(),
      imageUri: initialValues?.imageUri,
    }),
    [initialValues],
  );

  const { control, handleSubmit, setValue, watch } = useForm<ExpenseFormValues>({
    defaultValues,
  });

  const description = watch("description");
  const category = watch("category");
  const imageUri = watch("imageUri");
  const dateValue = watch("date");

  useEffect(() => {
    const detectCategory = async () => {
      if (mode === "edit" && !initialDetectRef.current) {
        initialDetectRef.current = true;
        return;
      }

      if (description.trim().length >= 3) {
        setAiDetecting(true);
        try {
          const detectedCategory = await detectExpenseCategory(description);

          if (detectedCategory) {
            setValue("category", detectedCategory);
            setAiDetectedCategory(true);
          }
        } catch (error) {
          console.warn("Failed to detect expense category", error);
        } finally {
          setAiDetecting(false);
        }
      }
    };

    const timeout = setTimeout(detectCategory, 500);
    return () => clearTimeout(timeout);
  }, [description, mode, setValue]);

  const pickImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          t.form.permission || "Permission Required",
          t.alerts.photoLibraryPermission,
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setValue("imageUri", result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t.alerts.errorTitle, t.alerts.pickImageFailed);
    }
  };

  const handleSave = handleSubmit((values) => {
    if (!checkRateLimit("expense-form")) {
      showNotification(
        t.alerts.tooManyRequests || "Too many requests. Please wait a moment.",
        {
          type: "warning",
          title: t.alerts.errorTitle,
          dedupeKey: "form-rate-limit",
        },
      );
      return;
    }

    const amountValidation = validateAmount(values.amount);
    if (!amountValidation.isValid) {
      Alert.alert(t.alerts.errorTitle, amountValidation.error || t.alerts.invalidAmount);
      return;
    }

    const descriptionValidation = validateDescription(values.description || "", 200);
    if (!descriptionValidation.isValid) {
      Alert.alert(
        t.alerts.errorTitle,
        descriptionValidation.error || "Invalid description",
      );
      return;
    }

    const sanitizedDescription = values.description.trim()
      ? descriptionValidation.sanitized || ""
      : "";

    onSubmit({
      ...values,
      amount: amountValidation.sanitized || values.amount,
      description: sanitizedDescription,
      aiDetected: aiDetectedCategory,
    });
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.outline }]}> 
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t.form.cancel}
            style={styles.iconButton}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.amountSection}>
            <Text style={[styles.currencyPrefix, { color: colors.primary }]}> 
              {settings.currency.code}
            </Text>
            <Controller
              control={control}
              name="amount"
              render={({ field: { onChange, value } }) => (
                <BanglaNumberInput
                  value={value}
                  onChangeText={onChange}
                  isBanglaMode={settings.language === "bn"}
                  placeholder={t.placeholders.heroAmount || "0"}
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.heroAmountInput,
                    {
                      color: colors.text,
                      borderWidth: 0,
                      backgroundColor: "transparent",
                    },
                  ]}
                />
              )}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>{t.form.category}</Text>
              {aiDetecting && (
                <View style={[styles.aiBadge, { backgroundColor: colors.primary + "20" }]}> 
                  <HugeiconsIcon icon={Sun03Icon} size={14} color={colors.primary} />
                  <Text style={[styles.aiBadgeText, { color: colors.primary }]}> 
                    {t.helpers.aiDetecting}
                  </Text>
                </View>
              )}
              {aiDetectedCategory && !aiDetecting && (
                <View style={[styles.aiBadge, { backgroundColor: colors.primary + "20" }]}> 
                  <HugeiconsIcon icon={Sun03Icon} size={14} color={colors.primary} />
                  <Text style={[styles.aiBadgeText, { color: colors.primary }]}> 
                    {t.helpers.aiSuggested}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.chipGrid}>
              {EXPENSE_CATEGORIES.map((cat) => {
                const selected = category === cat.value;

                return (
                  <Pressable
                    key={cat.value}
                    onPress={() => {
                      setValue("category", cat.value);
                      setAiDetectedCategory(false);
                    }}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selected
                          ? colors.primaryContainer
                          : colors.surfaceVariant,
                        borderColor: selected ? colors.primary : colors.outline,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: selected ? colors.primary : colors.text },
                      ]}
                    >
                      {t.categories[cat.value as keyof typeof t.categories]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>{t.form.date}</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[styles.dateRow, { borderColor: colors.outline, backgroundColor: colors.surface }]}
              accessibilityRole="button"
              accessibilityLabel={t.form.selectDate}
            >
              <View style={styles.dateLeft}>
                <HugeiconsIcon icon={Calendar03Icon} size={20} color={colors.textSecondary} />
                <Text style={[styles.dateText, { color: colors.text }]}> 
                  {dateValue.toLocaleDateString(
                    settings.language === "bn" ? "bn-BD" : "en-US",
                  )}
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>{t.form.description}</Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder={t.placeholders.expenseDescription}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={[
                    styles.noteInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderColor: colors.outline,
                    },
                  ]}
                />
              )}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>{t.form.attachment}</Text>
            {imageUri ? (
              <View style={styles.previewWrap}>
                <AppImage uri={imageUri} style={styles.previewImage} contentFit="cover" />
                <Pressable
                  onPress={() => setValue("imageUri", undefined)}
                  style={[styles.removePreviewButton, { backgroundColor: colors.error }]}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={18} color={colors.onError} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.mediaRow}>
                <Pressable
                  onPress={() => setCameraVisible(true)}
                  style={[styles.mediaButton, { borderColor: colors.outline }]}
                >
                  <HugeiconsIcon icon={Camera01Icon} size={22} color={colors.primary} />
                  <Text style={[styles.mediaButtonText, { color: colors.text }]}> 
                    {t.form.takePhoto}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={pickImageFromGallery}
                  style={[styles.mediaButton, { borderColor: colors.outline }]}
                >
                  <HugeiconsIcon icon={Image02Icon} size={22} color={colors.primary} />
                  <Text style={[styles.mediaButtonText, { color: colors.text }]}> 
                    {t.form.choosePhoto}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footerWrap} pointerEvents="box-none">
          <LinearGradient
            colors={["transparent", colors.background]}
            style={styles.footerGradient}
            pointerEvents="none"
          />
          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.background,
                paddingBottom: Math.max(insets.bottom, 12) + 12,
              },
            ]}
          >
            <Pressable
              onPress={handleSave}
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel={mode === "edit" ? t.expenses.editTransaction : t.expenses.addTransaction}
            >
              <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}> 
                {t.expenses.saveTransaction}
              </Text>
            </Pressable>
          </View>
        </View>

        {showDatePicker ? (
          <DateTimePicker
            value={dateValue}
            mode="date"
            display="default"
            onChange={(_event, date) => {
              setShowDatePicker(false);
              if (date) {
                setValue("date", date);
              }
            }}
          />
        ) : null}

        <CameraModal
          visible={cameraVisible}
          onClose={() => setCameraVisible(false)}
          onCapture={(uri) => {
            setValue("imageUri", uri);
            setCameraVisible(false);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },
  amountSection: {
    alignItems: "center",
    marginBottom: 26,
  },
  currencyPrefix: {
    fontSize: 40,
    fontWeight: "700",
    marginBottom: 4,
  },
  heroAmountInput: {
    width: "100%",
    fontSize: 40,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  section: {
    marginBottom: 22,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    flexWrap: "wrap",
    rowGap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dateRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dateLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "500",
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 80,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  mediaRow: {
    flexDirection: "row",
    gap: 12,
  },
  mediaButton: {
    flex: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    minHeight: 108,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  previewWrap: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 210,
  },
  removePreviewButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  footerWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerGradient: {
    height: 40,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
