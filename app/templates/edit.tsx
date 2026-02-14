import { BanglaNumberInput } from "@/components/shared/bangla-number-input";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { normalizeProductName } from "@/features/templates/services/template-utils";
import { GROCERY_CATEGORIES, GroceryCategory } from "@/types";
import { parseBanglaNumber } from "@/utils/format";
import { triggerLightHaptic } from "@/utils/haptics";
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface EditTemplateFormValues {
  productName: string;
  quantity: string;
  price: string;
  category: GroceryCategory;
}

export default function EditTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { templates, updateTemplate, colorScheme, settings, formatNumber, t } =
    useApp();
  const colors = Colors[colorScheme];

  const template = templates.find((t) => t.id === id);

  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<EditTemplateFormValues>({
    defaultValues: {
      productName: "",
      quantity: "",
      price: "",
      category: "other",
    },
  });

  useEffect(() => {
    if (template) {
      reset({
        productName: template.productNameDisplay,
        quantity: template.defaultQuantity,
        price: template.defaultPrice.toString(),
        category: template.category,
      });
    }
  }, [reset, template]);

  if (!template) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorMessage, { color: colors.error }]}>
            {t.templates.templateNotFound}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.buttonText}>{t.templates.goBack}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = handleSubmit(async (values) => {
    setLoading(true);
    try {
      const normalizedPrice = parseBanglaNumber(values.price).trim();
      const parsedPrice = Number.parseFloat(normalizedPrice);
      const safePrice = Number.isNaN(parsedPrice) ? 0 : parsedPrice;

      await updateTemplate(id, {
        productNameDisplay: values.productName.trim(),
        productNameNormalized: normalizeProductName(values.productName),
        defaultQuantity: values.quantity.trim(),
        defaultPrice: safePrice,
        category: values.category,
      });

      router.back();
    } catch {
      Alert.alert(t.alerts.errorTitle, t.alerts.failedToUpdate);
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <HugeiconsIcon icon={Cancel01Icon} size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {t.templates.editTemplate}
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={loading}
          style={styles.headerButton}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <HugeiconsIcon icon={Tick02Icon} size={24} color={colors.primary} />
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.form}>
        {/* Source Badge */}
        <View style={styles.sourceBadgeContainer}>
          <View
            style={[
              styles.sourceBadge,
              {
                backgroundColor:
                  template.source === "learned"
                    ? colors.primary + "20"
                    : colors.outline,
              },
            ]}
          >
            <Text
              style={[
                styles.sourceBadgeText,
                {
                  color:
                    template.source === "learned"
                      ? colors.primary
                      : colors.textSecondary,
                },
              ]}
            >
              {template.source === "learned"
                ? t.templates.aiLearned
                : t.templates.manualTag}
            </Text>
          </View>
          <Text style={[styles.usageText, { color: colors.textSecondary }]}>
            {t.templates.usageDisplay.replace(
              "{count}",
              formatNumber(template.usageCount || 0),
            )}
          </Text>
        </View>

        {/* Product Name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t.templates.productName} {t.templates.required}
          </Text>
          <Controller
            control={control}
            name="productName"
            rules={{
              validate: (value) =>
                value.trim() ? true : t.alerts.requiredProductName,
            }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  clearErrors("productName");
                }}
                placeholder={t.placeholders.templateName}
                placeholderTextColor={colors.textSecondary}
                onKeyPress={triggerLightHaptic}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: errors.productName ? colors.error : colors.outline,
                  },
                ]}
              />
            )}
          />
          {errors.productName?.message && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errors.productName.message}
            </Text>
          )}
        </View>

        {/* Quantity */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t.templates.defaultQuantity}
          </Text>
          <Controller
            control={control}
            name="quantity"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={formatNumber(value || "")}
                onChangeText={(text) => onChange(parseBanglaNumber(text))}
                placeholder={t.placeholders.templateQuantity}
                placeholderTextColor={colors.textSecondary}
                onKeyPress={triggerLightHaptic}
                style={[
                  styles.input,
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

        {/* Price */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t.templates.defaultPrice} {t.templates.required}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={[styles.currencySymbol, { color: colors.text }]}>
              {settings.currency.symbol}
            </Text>
            <Controller
              control={control}
              name="price"
              rules={{
                validate: (value) => {
                  const normalizedPrice = parseBanglaNumber(value).trim();
                  const priceNum = Number.parseFloat(normalizedPrice);
                  if (!normalizedPrice || Number.isNaN(priceNum) || priceNum < 0) {
                    return t.alerts.requiredValidPrice;
                  }
                  return true;
                },
              }}
              render={({ field: { onChange, value } }) => (
                <BanglaNumberInput
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    clearErrors("price");
                  }}
                  isBanglaMode={settings.language === "bn"}
                  placeholder={t.placeholders.templatePrice}
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.priceInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderColor: errors.price ? colors.error : colors.outline,
                    },
                  ]}
                />
              )}
            />
          </View>
          {errors.price?.message && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errors.price.message}
            </Text>
          )}
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t.templates.category} {t.templates.required}
          </Text>
          <Controller
            control={control}
            name="category"
            render={({ field: { value } }) => (
              <View style={styles.categoryGrid}>
                {GROCERY_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.value}
                    onPress={() => setValue("category", cat.value)}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor:
                          value === cat.value ? colors.primary : colors.surface,
                        borderColor: colors.outline,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color: value === cat.value ? "#fff" : colors.text,
                        },
                      ]}
                    >
                      {t.categories[cat.value as keyof typeof t.categories]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          />
        </View>
      </ScrollView>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    lineHeight: 26,
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sourceBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
    rowGap: 8,
  },
  sourceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  usageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "500",
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorMessage: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
});
