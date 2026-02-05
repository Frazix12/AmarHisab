import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { detectExpenseCategory } from "@/services/ai/gemini";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "@/types";
import { useModalAnimation } from "@/utils/animations";
import { parseBanglaNumber } from "@/utils/format";
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
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Animated from "react-native-reanimated";

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  onClose,
}) => {
  const { addExpense, settings, colorScheme, t, formatNumber } = useApp();
  const colors = Colors[colorScheme];
  const { animatedStyle, backdropStyle } = useModalAnimation(visible);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [aiDetecting, setAiDetecting] = useState(false);
  const [aiDetectedCategory, setAiDetectedCategory] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setAmount("");
      setCategory("food");
      setDescription("");
      setImageUri(undefined);
      setAiDetecting(false);
      setAiDetectedCategory(false);
    }
  }, [visible]);

  // AI Category Detection
  useEffect(() => {
    const detectCategory = async () => {
      if (description.trim().length >= 3) {
        setAiDetecting(true);
        const detectedCategory = await detectExpenseCategory(description);
        setAiDetecting(false);

        if (detectedCategory) {
          setCategory(detectedCategory as ExpenseCategory);
          setAiDetectedCategory(true);
        }
      }
    };

    const timeout = setTimeout(detectCategory, 500);
    return () => clearTimeout(timeout);
  }, [description]);

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
        setImageUri(result.assets[0].uri);
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
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error capturing image:", error);
      Alert.alert(t.alerts.errorTitle, t.alerts.captureImageFailed);
    }
  };

  const removeImage = () => {
    setImageUri(undefined);
  };

  const handleSave = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t.alerts.errorTitle, t.alerts.invalidAmount);
      return;
    }

    addExpense({
      amount: numAmount,
      category,
      date: new Date(),
      description: description.trim(),
      currency: settings.currency.code,
      imageUri,
      aiDetected: aiDetectedCategory,
    });

    // Reset form
    setAmount("");
    setCategory("food");
    setDescription("");
    setImageUri(undefined);
    setAiDetecting(false);
    setAiDetectedCategory(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
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
                {t.expenses.addExpense}
              </Text>
              <Pressable onPress={onClose}>
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
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceVariant,
                      color: colors.text,
                      borderColor: colors.outline,
                    },
                  ]}
                  value={formatNumber(amount)}
                  onChangeText={(text) => setAmount(parseBanglaNumber(text))}
                  keyboardType="decimal-pad"
                  placeholder={t.placeholders.expenseAmount}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {t.form.description}
                </Text>
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
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t.placeholders.expenseDescription}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
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
                        setCategory(cat.value);
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
