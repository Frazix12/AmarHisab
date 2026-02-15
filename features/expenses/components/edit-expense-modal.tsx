import { BanglaNumberInput } from "@/components/shared/bangla-number-input";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { AppImage } from "@/components/ui/app-image";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { EXPENSE_CATEGORIES, Expense, ExpenseCategory } from "@/types";
import { useModalAnimation } from "@/utils/animations";
import {
  Camera01Icon,
  Cancel01Icon,
  Image02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

interface EditExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  expense: Expense;
  onSave?: () => void;
}

interface EditExpenseFormValues {
  amount: string;
  category: ExpenseCategory;
  description: string;
  imageUri?: string;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  visible,
  onClose,
  expense,
  onSave,
}) => {
  const { updateExpense, colorScheme, t, settings } = useApp();
  const colors = Colors[colorScheme];
  const { animatedStyle, backdropStyle, shouldRender } = useModalAnimation(visible);

  const amountInputRef = useRef<TextInput | null>(null);
  const { control, handleSubmit, reset, setValue, watch } =
    useForm<EditExpenseFormValues>({
      defaultValues: {
        amount: "",
        category: "food",
        description: "",
        imageUri: undefined,
      },
    });
  const category = watch("category");
  const imageUri = watch("imageUri");

  // Initialize form with expense data when modal opens
  useEffect(() => {
    if (visible && expense) {
      reset({
        amount: expense.amount.toString(),
        category: expense.category,
        description: expense.description || "",
        imageUri: expense.imageUri,
      });
    }
  }, [visible, expense, reset]);

  const pickImageFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          t.form.permission || "Permission Required",
          t.alerts?.photoLibraryPermission ||
            "Photo library permission is required to attach images.",
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
      Alert.alert(
        t.alerts?.errorTitle ?? "Error",
        t.alerts?.pickImageFailed ?? "Failed to pick image. Please try again.",
      );
    }
  };

  const captureImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          t.form.permission || "Permission Required",
          t.alerts?.cameraPermission ||
            "Camera permission is required to capture photos.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setValue("imageUri", result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error capturing image:", error);
      const fallbackMessage =
        t.alerts?.captureImageFailed ??
        "Failed to capture image. Please try again.";
      const errorDetail = error instanceof Error ? error.message : "";
      const message = errorDetail
        ? `${fallbackMessage}\n${errorDetail}`
        : fallbackMessage;
      Alert.alert(t.alerts?.errorTitle ?? "Error", message, [
        {
          text: "Retry",
          onPress: () => {
            void captureImageFromCamera();
          },
        },
        {
          text: t.form.cancel || "Cancel",
          style: "cancel",
          onPress: onClose,
        },
      ]);
    }
  };

  const removeImage = () => {
    setValue("imageUri", undefined);
  };

  const handleSave = handleSubmit((values) => {
    const numAmount = parseFloat(values.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(
        t.alerts?.errorTitle ?? "Error",
        t.alerts?.invalidAmount ?? "Please enter a valid amount",
        [
          {
            text: t.form.cancel || "Cancel",
            style: "cancel",
            onPress: onClose,
          },
          {
            text: "OK",
            onPress: () => amountInputRef.current?.focus(),
          },
        ],
      );
      return;
    }

    updateExpense(expense.id, {
      amount: numAmount,
      category: values.category,
      description: values.description.trim(),
      imageUri: values.imageUri,
    });

    onSave?.();
    onClose();
  });

  if (!shouldRender) return null;

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, backdropStyle]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoid}
        >
          <Animated.View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface },
              animatedStyle,
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t.expenses.editExpense || "Edit Expense"}
              </Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={24}
                  color={colors.text}
                  strokeWidth={2}
                />
              </Pressable>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}> 
                  {t.form.amount}
                </Text>
                <Controller
                  control={control}
                  name="amount"
                  render={({ field: { onChange, value } }) => (
                    <BanglaNumberInput
                      ref={amountInputRef}
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surfaceVariant,
                          color: colors.text,
                          borderColor: colors.outline,
                        },
                      ]}
                      value={value}
                      onChangeText={onChange}
                      isBanglaMode={settings.language === "bn"}
                      placeholder={t.placeholders.expenseAmount}
                      placeholderTextColor={colors.textSecondary}
                    />
                  )}
                />
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}> 
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
                          color: colors.text,
                          borderColor: colors.outline,
                        },
                      ]}
                      value={value}
                      onChangeText={onChange}
                      placeholder={t.placeholders.expenseDescription}
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      numberOfLines={3}
                    />
                  )}
                />
              </View>

              {/* Image Attachment */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {t.form.attachment || "Attachment"}
                </Text>

                {imageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <AppImage
                      uri={imageUri}
                      style={styles.imagePreview}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={removeImage}
                      style={[
                        styles.removeImageButton,
                        { backgroundColor: colors.error || "#DC2626" },
                      ]}
                    >
                      <HugeiconsIcon
                        icon={Cancel01Icon}
                        size={20}
                        color="#FFFFFF"
                        strokeWidth={2}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.imageButtonsContainer}>
                    <Pressable
                      onPress={captureImageFromCamera}
                      style={[
                        styles.imageButton,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderColor: colors.outline,
                        },
                      ]}
                    >
                      <HugeiconsIcon
                        icon={Camera01Icon}
                        size={24}
                        color={colors.primary}
                        strokeWidth={2}
                      />
                      <Text
                        style={[styles.imageButtonText, { color: colors.text }]}
                      >
                        {t.form.takePhoto || "Take Photo"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={pickImageFromGallery}
                      style={[
                        styles.imageButton,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderColor: colors.outline,
                        },
                      ]}
                    >
                      <HugeiconsIcon
                        icon={Image02Icon}
                        size={24}
                        color={colors.primary}
                        strokeWidth={2}
                      />
                      <Text
                        style={[styles.imageButtonText, { color: colors.text }]}
                      >
                        {t.form.choosePhoto || "Choose Photo"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Category Picker */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
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
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.modalFooter}>
              <Pressable
                onPress={onClose}
                style={[
                  styles.button,
                  styles.cancelButton,
                  { backgroundColor: colors.surfaceVariant },
                ]}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  {t.form.cancel}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={[
                  styles.button,
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                ]}
              >
                <HugeiconsIcon
                  icon={Tick02Icon}
                  size={20}
                  color={colors.onPrimary}
                  strokeWidth={2.5}
                />
                <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                  {t.form.save}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {},
  saveButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
  imageButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  imageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
