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
import { router } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface AddTemplateFormValues {
  productName: string;
  quantity: string;
  price: string;
  category: GroceryCategory;
}

export default function AddTemplateScreen() {
  const { addTemplate, colorScheme, settings, formatNumber, t } = useApp();
  const colors = Colors[colorScheme];

  const {
    control,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<AddTemplateFormValues>({
    defaultValues: {
      productName: "",
      quantity: "",
      price: "",
      category: "other",
    },
  });

  const handleSave = handleSubmit(async (values) => {
    const normalizedPrice = parseBanglaNumber(values.price).trim();
    const priceNum = Number.parseFloat(normalizedPrice);

    try {
      await addTemplate({
        userId: "default",
        productNameDisplay: values.productName.trim(),
        productNameNormalized: normalizeProductName(values.productName),
        defaultQuantity: values.quantity.trim(),
        defaultPrice: priceNum,
        category: values.category,
        source: "manual",
      });

      router.back();
    } catch {
      Alert.alert(t.alerts.errorTitle, t.alerts.failedToCreate);
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
          {t.templates.newTemplate}
        </Text>
        <Pressable onPress={handleSave} style={styles.headerButton}>
          <HugeiconsIcon icon={Tick02Icon} size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView style={styles.form}>
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
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t.helpers.templateQuantityHint}
          </Text>
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

        {/* Info */}
        <View
          style={[styles.infoBox, { backgroundColor: colors.primary + "10" }]}
        >
          <Text style={[styles.infoText, { color: colors.primary }]}>
            {t.helpers.templateInfo}
          </Text>
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
  hint: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
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
  infoBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
