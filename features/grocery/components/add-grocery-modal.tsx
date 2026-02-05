import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { detectItemCategory } from "@/services/ai/gemini";
import { GROCERY_CATEGORIES, GroceryCategory } from "@/types";
import { TemplateMatch } from "@/types/template";
import { useModalAnimation } from "@/utils/animations";
import { parseBanglaNumber } from "@/utils/format";
import {
    Cancel01Icon,
    Sun03Icon,
    Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useEffect, useState } from "react";
import {
    Alert,
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

interface AddGroceryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddGroceryModal: React.FC<AddGroceryModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    addGroceryItem,
    settings,
    colorScheme,
    t,
    findMatchingTemplates,
    applyTemplate,
    formatNumber,
  } = useApp();
  const colors = Colors[colorScheme];
  const { animatedStyle, backdropStyle } = useModalAnimation(visible);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<GroceryCategory>("other");
  const [matchingTemplates, setMatchingTemplates] = useState<TemplateMatch[]>(
    [],
  );
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(
    null,
  );
  const [aiDetecting, setAiDetecting] = useState(false);
  const [aiDetectedCategory, setAiDetectedCategory] = useState(false);

  // Find matching templates as user types
  useEffect(() => {
    const searchTemplates = async () => {
      if (name.trim().length >= 2) {
        const matches = await findMatchingTemplates(name);
        setMatchingTemplates(matches);
      } else {
        setMatchingTemplates([]);
      }
    };

    const timeout = setTimeout(searchTemplates, 300);
    return () => clearTimeout(timeout);
  }, [name, findMatchingTemplates]);

  // AI Category Detection
  useEffect(() => {
    const detectCategory = async () => {
      if (name.trim().length >= 2 && !appliedTemplateId) {
        setAiDetecting(true);
        const detectedCategory = await detectItemCategory(name);
        setAiDetecting(false);

        if (detectedCategory) {
          setCategory(detectedCategory);
          setAiDetectedCategory(true);
        }
      }
    };

    const timeout = setTimeout(detectCategory, 500);
    return () => clearTimeout(timeout);
  }, [name, appliedTemplateId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setName("");
      setQuantity("");
      setPrice("");
      setCategory("other");
      setMatchingTemplates([]);
      setAppliedTemplateId(null);
      setShowTemplatePicker(false);
      setAiDetecting(false);
      setAiDetectedCategory(false);
    }
  }, [visible]);

  const handleAutofill = async (templateId?: string) => {
    const idToUse = templateId || matchingTemplates[0]?.template.id;
    if (!idToUse) return;

    const data = await applyTemplate(idToUse);
    if (data) {
      if (data.name) setName(data.name);
      if (data.quantity) setQuantity(data.quantity);
      if (data.price !== undefined) setPrice(data.price.toString());
      if (data.category) setCategory(data.category);
      setAppliedTemplateId(idToUse);
    }
    setShowTemplatePicker(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t.alerts.errorTitle, t.alerts.requiredName);
      return;
    }

    // Allow price to be 0 (no price set) or any positive number
    const numPrice = price.trim() ? parseFloat(price) : 0;
    if (isNaN(numPrice) || numPrice < 0) {
      Alert.alert(t.alerts.errorTitle, t.alerts.priceNegative);
      return;
    }

    addGroceryItem({
      name: name.trim(),
      quantity: quantity.trim(),
      price: numPrice,
      category,
      checked: false,
      templateId: appliedTemplateId || undefined,
      aiDetected: aiDetectedCategory,
    });

    // Reset form
    setName("");
    setQuantity("");
    setPrice("");
    setCategory("other");
    setMatchingTemplates([]);
    setAppliedTemplateId(null);
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
              {t.grocery.addItem}
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
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {t.form.name}
                </Text>
                {matchingTemplates.length > 0 && (
                  <Pressable
                    onPress={() =>
                      matchingTemplates.length === 1
                        ? handleAutofill()
                        : setShowTemplatePicker(true)
                    }
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
                      {t.helpers.aiAutofillHint}
                    </Text>
                  </Pressable>
                )}
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceVariant,
                    color: colors.text,
                    borderColor: appliedTemplateId
                      ? colors.primary
                      : colors.outline,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder={t.placeholders.groceryName}
                placeholderTextColor={colors.textSecondary}
              />
              {matchingTemplates.length > 0 && !appliedTemplateId && (
                <Text
                  style={[styles.templateHint, { color: colors.textSecondary }]}
                >
                  💡 {matchingTemplates[0].template.productNameDisplay} •{" "}
                  {settings.currency.symbol}
                  {formatNumber(
                    matchingTemplates[0].template.defaultPrice.toFixed(2),
                  )}
                </Text>
              )}
              {appliedTemplateId && (
                <Text style={[styles.appliedHint, { color: colors.primary }]}>
                  {t.helpers.usingTemplate}
                </Text>
              )}
            </View>

            {/* Quantity and Price Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {t.form.quantity}
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
                  value={formatNumber(quantity)}
                  onChangeText={(text) => setQuantity(parseBanglaNumber(text))}
                  placeholder={t.placeholders.groceryQuantity}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {t.form.price} ({settings.currency.symbol})
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
                  value={formatNumber(price)}
                  onChangeText={(text) => setPrice(parseBanglaNumber(text))}
                  keyboardType="decimal-pad"
                  placeholder={t.placeholders.groceryPrice}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
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
                {GROCERY_CATEGORIES.map((cat) => (
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

        {/* Template Picker Modal */}
        {showTemplatePicker && matchingTemplates.length > 1 && (
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setShowTemplatePicker(false)}
          >
            <View
              style={[
                styles.pickerContent,
                { backgroundColor: colors.surface },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                {t.templates.selectTemplate} ({formatNumber(matchingTemplates.length)} {t.templates.matches})
              </Text>
              <ScrollView style={styles.pickerList}>
                {matchingTemplates.map((match) => (
                  <Pressable
                    key={match.template.id}
                    onPress={() => handleAutofill(match.template.id)}
                    style={[
                      styles.templateOption,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                  >
                    <View style={styles.templateOptionMain}>
                      <Text
                        style={[styles.templateName, { color: colors.text }]}
                      >
                        {match.template.productNameDisplay}
                      </Text>
                      <View style={styles.templateMeta}>
                        <Text
                          style={[
                            styles.templateDetail,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {match.template.defaultQuantity || "—"}
                        </Text>
                        <Text
                          style={[
                            styles.templateDetailDot,
                            { color: colors.textSecondary },
                          ]}
                        >
                          •
                        </Text>
                        <Text
                          style={[styles.templatePrice, { color: colors.text }]}
                        >
                          {settings.currency.symbol}
                          {formatNumber(match.template.defaultPrice.toFixed(2))}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.templateOptionRight}>
                      <Text
                        style={[
                          styles.confidenceText,
                          { color: colors.primary },
                        ]}
                      >
                        {Math.round(match.confidence * 100)}% {t.templates.match}
                      </Text>
                      <Text
                        style={[
                          styles.usageText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t.templates.usageDisplay.replace(
                          "{count}",
                          formatNumber(match.template.usageCount),
                        )}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        )}
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    flex: 1,
    flexShrink: 1,
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
  templateHint: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  appliedHint: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
    lineHeight: 16,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerContent: {
    width: "85%",
    maxHeight: "70%",
    borderRadius: 16,
    padding: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  pickerList: {
    maxHeight: 400,
  },
  templateOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexWrap: "wrap",
    rowGap: 8,
  },
  templateOptionMain: {
    flex: 1,
    minWidth: 0,
  },
  templateName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 20,
    flexShrink: 1,
  },
  templateMeta: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  templateDetail: {
    fontSize: 13,
    lineHeight: 18,
  },
  templateDetailDot: {
    fontSize: 13,
    lineHeight: 18,
  },
  templatePrice: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  templateOptionRight: {
    alignItems: "flex-end",
    flexShrink: 1,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
    lineHeight: 16,
  },
  usageText: {
    fontSize: 11,
    lineHeight: 15,
  },
});
