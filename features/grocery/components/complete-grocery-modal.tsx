import { BanglaNumberInput } from "@/components/shared/bangla-number-input";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { GroceryItem } from "@/types";
import { useModalAnimation } from "@/utils/animations";
import {
    Camera01Icon,
    Cancel01Icon,
    Image02Icon,
    Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

interface CompleteGroceryModalProps {
  visible: boolean;
  item: GroceryItem | null;
  onClose: () => void;
  onComplete: (price: number, imageUri?: string) => void;
}

export const CompleteGroceryModal: React.FC<CompleteGroceryModalProps> = ({
  visible,
  item,
  onClose,
  onComplete,
}) => {
  const { colorScheme, t, settings, formatNumber } = useApp();
  const colors = Colors[colorScheme];
  const { animatedStyle, backdropStyle, shouldRender } = useModalAnimation(visible);

  const [price, setPrice] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [priceInputY, setPriceInputY] = useState(0);
  const scrollRef = React.useRef<ScrollView>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible && item) {
      setPrice(item.price !== null ? item.price.toString() : "");
      setImageUri(item.imageUri);
      setError("");
      setIsPriceFocused(false);
      setKeyboardHeight(0);
    } else {
      setPrice("");
      setImageUri(undefined);
      setError("");
      setIsPriceFocused(false);
      setKeyboardHeight(0);
    }
  }, [visible, item]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollPriceFieldIntoView = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(priceInputY - 16, 0),
        animated: true,
      });
    });
  };

  const extraKeyboardSpace = isPriceFocused
    ? settings.language === "bn"
      ? 330
      : keyboardHeight
    : 0;

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
    } catch (err) {
      console.error("Error picking image:", err);
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
    } catch (err) {
      console.error("Error capturing image:", err);
      Alert.alert(t.alerts.errorTitle, t.alerts.captureImageFailed);
    }
  };

  const removeImage = () => {
    setImageUri(undefined);
  };

  const handleComplete = () => {
    const numPrice = parseFloat(price);

    if (!price.trim() || isNaN(numPrice) || numPrice <= 0) {
      setError(
        t.grocery?.priceRequired || "Price is required to complete this item",
      );
      return;
    }

    onComplete(numPrice, imageUri);
  };

  if (!item) return null;

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
                {t.grocery?.completeItem || "Complete Item"}
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

            <ScrollView
              ref={scrollRef}
              style={styles.formContainer}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.formContent,
                { paddingBottom: 20 + extraKeyboardSpace },
              ]}
            >
              {/* Item Details (Read-only) */}
              <View style={styles.infoGroup}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  {t.form.item || "Item"}
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {item.name}
                </Text>
              </View>

              {item.quantity && (
                <View style={styles.infoGroup}>
                  <Text
                    style={[styles.infoLabel, { color: colors.textSecondary }]}
                  >
                    {t.form.quantity}
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatNumber(item.quantity)}
                  </Text>
                </View>
              )}

              <View style={styles.infoGroup}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  {t.form.category}
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {t.categories[item.category as keyof typeof t.categories]}
                </Text>
              </View>

              {/* Price Input (Required) */}
              <View
                style={styles.inputGroup}
                onLayout={(event) => {
                  setPriceInputY(event.nativeEvent.layout.y);
                }}
              >
                <Text style={[styles.label, { color: colors.text }]}>
                  {t.form.price}
                  <Text style={{ color: colors.error || "#DC2626" }}>*</Text>
                </Text>
                <BanglaNumberInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceVariant,
                      color: colors.text,
                      borderColor: error
                        ? colors.error || "#DC2626"
                        : colors.outline,
                      borderWidth: error ? 2 : 1,
                    },
                  ]}
                  value={price}
                  onChangeText={(text) => {
                    setPrice(text);
                    setError("");
                  }}
                  onFocus={() => {
                    setIsPriceFocused(true);
                    scrollPriceFieldIntoView();
                  }}
                  onBlur={() => setIsPriceFocused(false)}
                  isBanglaMode={settings.language === "bn"}
                  placeholder={`0.00 ${settings.currency.symbol}`}
                  placeholderTextColor={colors.textSecondary}
                />
                {error && (
                  <Text
                    style={[
                      styles.errorText,
                      { color: colors.error || "#DC2626" },
                    ]}
                  >
                    {error}
                  </Text>
                )}
              </View>

              {/* Image Attachment (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {t.form.attachment}{" "}
                  <Text
                    style={{ color: colors.textSecondary, fontWeight: "400" }}
                  >
                    ({t.common.optional})
                  </Text>
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
                        {t.form.takePhoto}
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
                        {t.form.choosePhoto}
                      </Text>
                    </Pressable>
                  </View>
                )}
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
                onPress={handleComplete}
                style={[
                  styles.button,
                  styles.completeButton,
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
                  {t.grocery?.completeAndCheck || "Complete & Check"}
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
  formContent: {
    paddingBottom: 20,
  },
  infoGroup: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  inputGroup: {
    marginTop: 20,
    marginBottom: 12,
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
  errorText: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
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
  completeButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
});
