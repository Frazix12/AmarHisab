import { BanglaNumberInput } from "@/components/shared/bangla-number-input";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { detectExpenseCategory } from "@/services/ai/gemini";
import { showNotification } from "@/services/notifications";
import { validateAmount, validateDescription, checkRateLimit } from "@/services/validation";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "@/types";
import {
  MorphingModalOptions,
  useMorphingModalAnimation,
} from "@/utils/animations";
import {
    Camera01Icon,
    Cancel01Icon,
    Image02Icon,
    Sun03Icon,
    Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    Alert,
    BackHandler,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import Animated from "react-native-reanimated";

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  fabConfig?: Pick<
    MorphingModalOptions,
    "fabSize" | "fabRight" | "fabBottom" | "modalHeightRatio"
  >;
}

interface AddExpenseFormValues {
  amount: string;
  category: ExpenseCategory;
  description: string;
  imageUri?: string;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  onClose,
  fabConfig,
}) => {
  const { addExpense, settings, colorScheme, t } = useApp();
  const colors = Colors[colorScheme];
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { shellStyle, backdropStyle, contentStyle, shouldRender } =
    useMorphingModalAnimation(visible, {
      screenWidth: windowWidth,
      screenHeight: windowHeight,
      fabSize: fabConfig?.fabSize ?? 60,
      fabRight: fabConfig?.fabRight ?? 20,
      fabBottom: fabConfig?.fabBottom ?? 20,
      modalHeightRatio: fabConfig?.modalHeightRatio ?? 0.82,
      contentStartProgress: 0.84,
      contentFadeDuration: 160,
    });

  const [aiDetecting, setAiDetecting] = useState(false);
  const [aiDetectedCategory, setAiDetectedCategory] = useState(false);

  const { control, handleSubmit, reset, setValue, watch } =
    useForm<AddExpenseFormValues>({
      defaultValues: {
        amount: "",
        category: "food",
        description: "",
        imageUri: undefined,
      },
    });

  const description = watch("description");
  const category = watch("category");
  const imageUri = watch("imageUri");

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      reset({
        amount: "",
        category: "food",
        description: "",
        imageUri: undefined,
      });
      setAiDetecting(false);
      setAiDetectedCategory(false);
    }
  }, [reset, visible]);

  useEffect(() => {
    if (!visible) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose();
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [onClose, visible]);

  // AI Category Detection
  useEffect(() => {
    const detectCategory = async () => {
      if (description.trim().length >= 3) {
        setAiDetecting(true);
        const detectedCategory = await detectExpenseCategory(description);
        setAiDetecting(false);

        if (detectedCategory) {
          setValue("category", detectedCategory);
          setAiDetectedCategory(true);
        }
      }
    };

    const timeout = setTimeout(detectCategory, 500);
    return () => clearTimeout(timeout);
  }, [description, setValue]);

  const pickImageFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

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

  const captureImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          t.form.permission || "Permission Required",
          t.alerts.cameraPermission,
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
      Alert.alert(t.alerts.errorTitle, t.alerts.captureImageFailed);
    }
  };

  const removeImage = () => {
    setValue("imageUri", undefined);
  };

  const handleSave = handleSubmit((values) => {
    // Rate limiting check
    if (!checkRateLimit("add-expense")) {
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

    // Validate amount
    const amountValidation = validateAmount(values.amount);
    if (!amountValidation.isValid) {
      Alert.alert(t.alerts.errorTitle, amountValidation.error || t.alerts.invalidAmount);
      return;
    }

    // Validate description (optional but sanitized if provided)
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

    const numAmount = parseFloat(amountValidation.sanitized || values.amount);

    addExpense({
      amount: numAmount,
      category: values.category,
      date: new Date(),
      description: sanitizedDescription || '',
      currency: settings.currency.code,
      imageUri: values.imageUri,
      aiDetected: aiDetectedCategory,
    });

    // Reset form
    reset({
      amount: "",
      category: "food",
      description: "",
      imageUri: undefined,
    });
    setAiDetecting(false);
    setAiDetectedCategory(false);
    onClose();
  });

  if (!shouldRender) return null;

  return (
    <View style={styles.rootOverlay} pointerEvents="box-none">
      <Pressable haptic="none" style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[styles.modalOverlay, backdropStyle]} />
      </Pressable>
      <Animated.View
        renderToHardwareTextureAndroid
        shouldRasterizeIOS
        style={[styles.growContainer, { backgroundColor: colors.surface }, shellStyle]}
      >
        <KeyboardAvoidingView
          behavior="padding"
          enabled={Platform.OS === "ios"}
          style={styles.keyboardAvoid}
        >
          <Animated.View
            style={[styles.modalContent, contentStyle]}
          >
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.outline }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t.expenses.addExpense}
              </Text>
              <View style={styles.closeAnchorSpacer} />
            </View>

            <ScrollView
              style={styles.formContainer}
              keyboardShouldPersistTaps="handled"
            >
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
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.imagePreview}
                      resizeMode="cover"
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
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {t.form.category}
                  </Text>
                  {aiDetecting && (
                    <View
                      style={[
                        styles.aiButton,
                        { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      <HugeiconsIcon
                        icon={Sun03Icon}
                        size={14}
                        color={colors.primary}
                      />
                      <Text
                        style={[styles.aiButtonText, { color: colors.primary }]}
                      >
                        {t.helpers.aiDetecting}
                      </Text>
                    </View>
                  )}
                  {aiDetectedCategory && !aiDetecting && (
                    <View
                      style={[
                        styles.aiButton,
                        { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      <HugeiconsIcon
                        icon={Sun03Icon}
                        size={14}
                        color={colors.primary}
                      />
                      <Text
                        style={[styles.aiButtonText, { color: colors.primary }]}
                      >
                        {t.helpers.aiSuggested}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.categoryGrid}>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.value}
                      onPress={() => {
                        setValue("category", cat.value);
                        setAiDetectedCategory(false);
                      }}
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
                onPress={handleSave}
                style={[
                  styles.button,
                  { backgroundColor: colors.success },
                ]}
              >
                <HugeiconsIcon
                  icon={Tick02Icon}
                  size={20}
                  color={colors.onSuccess}
                  strokeWidth={2.5}
                />
                <Text style={[styles.buttonText, { color: colors.onSuccess }]}>
                  {t.form.save}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  growContainer: {
    position: "absolute",
    overflow: "hidden",
  },
  keyboardAvoid: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  closeAnchorSpacer: {
    width: 24,
    height: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  button: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
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
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
    rowGap: 8,
  },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aiButtonText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
});
