import { BanglaNumberInput } from "@/components/shared/bangla-number-input";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { GROCERY_CATEGORIES, GroceryCategory, GroceryItem } from "@/types";
import { useModalAnimation } from "@/utils/animations";
import { parseBanglaNumber } from "@/utils/format";
import { triggerLightHaptic } from "@/utils/haptics";
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Animated from "react-native-reanimated";

interface EditGroceryModalProps {
  visible: boolean;
  onClose: () => void;
  item: GroceryItem;
  onSave?: () => void;
}

interface EditGroceryFormValues {
  name: string;
  quantity: string;
  price: string;
  category: GroceryCategory;
  updateTemplateChecked: boolean;
}

export const EditGroceryModal: React.FC<EditGroceryModalProps> = ({
  visible,
  onClose,
  item,
  onSave,
}) => {
  const {
    updateGroceryItem,
    updateTemplate,
    settings,
    colorScheme,
    t,
    formatNumber,
  } = useApp();
  const colors = Colors[colorScheme];
  const { animatedStyle, backdropStyle, shouldRender } = useModalAnimation(visible);
  const { control, handleSubmit, reset, setValue, watch } =
    useForm<EditGroceryFormValues>({
      defaultValues: {
        name: "",
        quantity: "",
        price: "",
        category: "other",
        updateTemplateChecked: false,
      },
    });

  const category = watch("category");
  const updateTemplateChecked = watch("updateTemplateChecked");

  // Initialize form with item data when modal opens
  useEffect(() => {
    if (visible && item) {
      reset({
        name: item.name,
        quantity: item.quantity,
        price: item.price !== null ? item.price.toString() : "",
        category: item.category,
        updateTemplateChecked: false,
      });
    }
  }, [visible, item, reset]);

  const handleSave = handleSubmit(async (values) => {
    if (!values.name.trim()) {
      Alert.alert(t.alerts.errorTitle, t.alerts.requiredName);
      return;
    }

    const normalizedPrice = parseBanglaNumber(values.price).trim();
    const hasPrice = normalizedPrice.length > 0;
    const numPrice = hasPrice ? Number.parseFloat(normalizedPrice) : null;
    if (hasPrice && (numPrice === null || isNaN(numPrice) || numPrice < 0)) {
      Alert.alert(t.alerts.errorTitle, t.alerts.invalidPrice);
      return;
    }

    // Update the grocery item
    updateGroceryItem(item.id, {
      name: values.name.trim(),
      quantity: values.quantity.trim(),
      price: numPrice,
      category: values.category,
    });

    // If user wants to update the template
    if (values.updateTemplateChecked && item.templateId) {
      await updateTemplate(item.templateId, {
        defaultQuantity: values.quantity.trim(),
        defaultPrice: numPrice ?? 0,
        category: values.category,
      });
    }

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
        <Animated.View
          style={[
            styles.modalContent,
            { backgroundColor: colors.surface },
            animatedStyle,
          ]}
        >
          {/* Header */}
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.outline }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t.grocery.editItem || "Edit Item"}
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
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}> 
                {t.form.name}
              </Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <TextInput
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
                    onKeyPress={triggerLightHaptic}
                    placeholder={t.placeholders.groceryName}
                    placeholderTextColor={colors.textSecondary}
                  />
                )}
              />
            </View>

            {/* Quantity and Price Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {t.form.quantity}
                </Text>
                <Controller
                  control={control}
                  name="quantity"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surfaceVariant,
                          color: colors.text,
                          borderColor: colors.outline,
                        },
                      ]}
                      value={formatNumber(value || "")}
                      onChangeText={(text) => onChange(parseBanglaNumber(text))}
                      onKeyPress={triggerLightHaptic}
                      placeholder={t.placeholders.groceryQuantity}
                      placeholderTextColor={colors.textSecondary}
                    />
                  )}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {t.form.price} ({settings.currency.symbol})
                </Text>
                <Controller
                  control={control}
                  name="price"
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
                      placeholder={t.placeholders.groceryPrice}
                      placeholderTextColor={colors.textSecondary}
                    />
                  )}
                />
              </View>
            </View>

            {/* Category Picker */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t.form.category}
              </Text>
              <View style={styles.categoryGrid}>
                {GROCERY_CATEGORIES.map((cat) => (
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

            {/* Template Update Option - Only show if item has templateId */}
            {item.templateId && (
              <View style={styles.inputGroup}>
                <Pressable
                  onPress={() =>
                    setValue("updateTemplateChecked", !updateTemplateChecked)
                  }
                  style={styles.checkboxRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: updateTemplateChecked
                          ? colors.primary
                          : colors.surface,
                        borderColor: updateTemplateChecked
                          ? colors.primary
                          : colors.outline,
                      },
                    ]}
                  >
                    {updateTemplateChecked && (
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        size={16}
                        color={colors.onPrimary}
                        strokeWidth={2.5}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.checkboxLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.form.updateTemplate ||
                      "Update this template with the new values"}
                  </Text>
                </Pressable>
              </View>
            )}
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
  row: {
    flexDirection: "row",
    gap: 12,
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
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
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
});
