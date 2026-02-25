import { BanglaNumberInput } from "@/components/shared/bangla-number-input";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import {
  useGroceryDomain,
  useI18n,
  useSettingsDomain,
  useTemplateDomain,
  useTheme,
} from "@/contexts/app-selectors";
import { detectItemCategory } from "@/services/ai/gemini";
import { showNotification } from "@/services/notifications";
import { validateName, validateQuantity, validateAmount, checkRateLimit } from "@/services/validation";
import { GROCERY_CATEGORIES, GroceryCategory } from "@/types";
import { TemplateMatch } from "@/types/template";
import {
  MorphingModalOptions,
  useMorphingModalAnimation,
} from "@/utils/animations";
import { parseBanglaNumber } from "@/utils/format";
import {
    Sun03Icon,
    Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    Alert,
    BackHandler,
    Platform,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import Animated from "react-native-reanimated";
import { triggerLightHaptic } from "@/utils/haptics";

interface AddGroceryModalProps {
  visible: boolean;
  onClose: () => void;
  fabConfig?: Pick<
    MorphingModalOptions,
    "fabSize" | "fabRight" | "fabBottom" | "modalHeightRatio"
  >;
}

interface AddGroceryFormValues {
  name: string;
  quantity: string;
  price: string;
  category: GroceryCategory;
}

export const AddGroceryModal: React.FC<AddGroceryModalProps> = ({
  visible,
  onClose,
  fabConfig,
}) => {
  const colorScheme = useTheme();
  const { t, formatNumber } = useI18n();
  const { settings } = useSettingsDomain();
  const { addGroceryItem } = useGroceryDomain();
  const { findMatchingTemplates, applyTemplate } = useTemplateDomain();
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

  const [matchingTemplates, setMatchingTemplates] = useState<TemplateMatch[]>(
    [],
  );
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(
    null,
  );
  const [aiDetecting, setAiDetecting] = useState(false);
  const [aiDetectedCategory, setAiDetectedCategory] = useState(false);
  const [userSelectedCategory, setUserSelectedCategory] = useState(false);
  const aiDetectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiDetectionRequestIdRef = useRef(0);

  const { control, handleSubmit, reset, setValue, watch } =
    useForm<AddGroceryFormValues>({
      defaultValues: {
        name: "",
        quantity: "",
        price: "",
        category: "other",
      },
    });

  const name = watch("name");
  const category = watch("category");

  // Find matching templates as user types
  useEffect(() => {
    let isCancelled = false;

    const searchTemplates = async () => {
      if (name.trim().length >= 2) {
        const matches = await findMatchingTemplates(name);
        if (!isCancelled) {
          setMatchingTemplates(matches);
        }
      } else {
        if (!isCancelled) {
          setMatchingTemplates([]);
        }
      }
    };

    const timeout = setTimeout(searchTemplates, 300);
    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [name, findMatchingTemplates]);

  // AI Category Detection
  useEffect(() => {
    if (aiDetectionTimeoutRef.current) {
      clearTimeout(aiDetectionTimeoutRef.current);
      aiDetectionTimeoutRef.current = null;
    }

    const detectCategory = async () => {
      if (name.trim().length >= 2 && !appliedTemplateId && !userSelectedCategory) {
        const requestId = ++aiDetectionRequestIdRef.current;
        setAiDetecting(true);
        try {
          const detectedCategory = await detectItemCategory(name);
          if (
            detectedCategory &&
            requestId === aiDetectionRequestIdRef.current &&
            !appliedTemplateId &&
            !userSelectedCategory
          ) {
            setValue("category", detectedCategory);
            setAiDetectedCategory(true);
          }
        } catch (error) {
          console.error("Error detecting grocery category:", error);
        } finally {
          if (requestId === aiDetectionRequestIdRef.current) {
            setAiDetecting(false);
          }
        }
      }
    };

    aiDetectionTimeoutRef.current = setTimeout(detectCategory, 500);
    return () => {
      if (aiDetectionTimeoutRef.current) {
        clearTimeout(aiDetectionTimeoutRef.current);
        aiDetectionTimeoutRef.current = null;
      }
    };
  }, [name, appliedTemplateId, setValue, userSelectedCategory]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      reset({
        name: "",
        quantity: "",
        price: "",
        category: "other",
      });
      setMatchingTemplates([]);
      setAppliedTemplateId(null);
      setShowTemplatePicker(false);
      setAiDetecting(false);
      setAiDetectedCategory(false);
      setUserSelectedCategory(false);
      if (aiDetectionTimeoutRef.current) {
        clearTimeout(aiDetectionTimeoutRef.current);
        aiDetectionTimeoutRef.current = null;
      }
      aiDetectionRequestIdRef.current += 1;
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

  const handleAutofill = async (templateId?: string) => {
    const idToUse = templateId || matchingTemplates[0]?.template.id;
    if (!idToUse) return;

    const data = await applyTemplate(idToUse);
    if (data) {
      if (aiDetectionTimeoutRef.current) {
        clearTimeout(aiDetectionTimeoutRef.current);
        aiDetectionTimeoutRef.current = null;
      }
      aiDetectionRequestIdRef.current += 1;
      setAiDetecting(false);
      setAiDetectedCategory(false);

      if (data.name) setValue("name", data.name);
      if (data.quantity) setValue("quantity", data.quantity);
      if (data.price !== undefined && data.price !== null) {
        setValue("price", data.price.toString());
      }
      if (data.category) setValue("category", data.category);
      setAppliedTemplateId(idToUse);
      setUserSelectedCategory(false);
    }
    setShowTemplatePicker(false);
  };

  const handleSave = handleSubmit((values) => {
    // Rate limiting check
    if (!checkRateLimit("add-grocery")) {
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

    // Validate name
    const nameValidation = validateName(values.name, 100);
    if (!nameValidation.isValid) {
      Alert.alert(t.alerts.errorTitle, nameValidation.error || t.alerts.requiredName);
      return;
    }

    // Validate quantity (optional)
    const quantityValidation = validateQuantity(values.quantity);
    if (!quantityValidation.isValid) {
      Alert.alert(t.alerts.errorTitle, quantityValidation.error || t.alerts.invalidInput);
      return;
    }

    const normalizedPrice = parseBanglaNumber(values.price).trim();
    const hasPrice = normalizedPrice.length > 0;
    
    // Validate price if provided
    if (hasPrice) {
      const priceValidation = validateAmount(normalizedPrice);
      if (!priceValidation.isValid) {
        Alert.alert(t.alerts.errorTitle, priceValidation.error || t.alerts.invalidPrice);
        return;
      }
    }
    
    const parsedPrice = hasPrice ? Number.parseFloat(normalizedPrice) : null;
    if (hasPrice && (parsedPrice === null || isNaN(parsedPrice) || parsedPrice < 0)) {
      Alert.alert(t.alerts.errorTitle, t.alerts.invalidPrice);
      return;
    }

    addGroceryItem({
      name: nameValidation.sanitized || values.name.trim(),
      quantity: quantityValidation.sanitized || values.quantity.trim(),
      price: parsedPrice,
      category: values.category,
      checked: false,
      templateId: appliedTemplateId || undefined,
      aiDetected: aiDetectedCategory,
    });

    // Reset form
    reset({
      name: "",
      quantity: "",
      price: "",
      category: "other",
    });
    setMatchingTemplates([]);
    setAppliedTemplateId(null);
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
        <Animated.View
          style={[styles.modalContent, contentStyle]}
        >
          {/* Header */}
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.outline }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t.grocery.addItem}
            </Text>
            <View style={styles.closeAnchorSpacer} />
          </View>

          <ScrollView
            style={styles.formContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {t.form.name}
                </Text>
                {matchingTemplates.length > 0 && (
                  <Pressable
                    haptic="medium"
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
                        borderColor: appliedTemplateId
                          ? colors.primary
                          : colors.outline,
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
              {matchingTemplates.length > 0 && !appliedTemplateId && (
                <Text
                  style={[styles.templateHint, { color: colors.textSecondary }]}
                >
                  {t.helpers.aiSuggested}: {matchingTemplates[0].template.productNameDisplay} •{" "}
                  {settings.currency.symbol}
                  {typeof matchingTemplates[0]?.template.defaultPrice === "number"
                    ? formatNumber(matchingTemplates[0].template.defaultPrice.toFixed(2))
                    : "-"}
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
                      setValue("category", cat.value);
                      setUserSelectedCategory(true);
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

        {/* Template Picker Modal */}
        {showTemplatePicker && matchingTemplates.length > 1 && (
          <Pressable
            haptic="none"
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
              <FlatList
                data={matchingTemplates}
                keyExtractor={(match) => match.template.id}
                style={styles.pickerList}
                renderItem={({ item: match }) => (
                  <Pressable
                    haptic="medium"
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
                          {typeof match.template.defaultPrice === "number"
                            ? formatNumber(match.template.defaultPrice.toFixed(2))
                            : "-"}
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
                )}
              />
            </View>
          </Pressable>
        )}
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
