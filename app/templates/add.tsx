import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { normalizeProductName } from "@/features/templates/services/template-utils";
import { GROCERY_CATEGORIES, GroceryCategory } from "@/types";
import { parseBanglaNumber } from "@/utils/format";
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AddTemplateScreen() {
  const { addTemplate, colorScheme, settings, formatNumber, t } = useApp();
  const colors = Colors[colorScheme];

  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<GroceryCategory>("other");

  const [errors, setErrors] = useState<{
    productName?: string;
    price?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!productName.trim()) {
      newErrors.productName = "Product name is required";
    }

    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum < 0) {
      newErrors.price = "Valid price is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      await addTemplate({
        userId: "default",
        productNameDisplay: productName.trim(),
        productNameNormalized: normalizeProductName(productName),
        defaultQuantity: quantity.trim(),
        defaultPrice: parseFloat(price),
        category,
        source: "manual",
      });

      router.back();
    } catch {
      Alert.alert("Error", "Failed to create template");
    }
  };

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
          <TextInput
            value={productName}
            onChangeText={(text) => {
              setProductName(text);
              if (errors.productName)
                setErrors({ ...errors, productName: undefined });
            }}
            placeholder={t.placeholders.templateName}
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: errors.productName ? colors.error : colors.outline,
              },
            ]}
          />
          {errors.productName && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errors.productName}
            </Text>
          )}
        </View>

        {/* Quantity */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t.templates.defaultQuantity}
          </Text>
          <TextInput
            value={formatNumber(quantity)}
            onChangeText={(text) => setQuantity(parseBanglaNumber(text))}
            placeholder={t.placeholders.templateQuantity}
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.outline,
              },
            ]}
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
            <TextInput
              value={formatNumber(price)}
              onChangeText={(text) => setPrice(parseBanglaNumber(text))}
              placeholder={t.placeholders.templatePrice}
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              style={[
                styles.priceInput,
                {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: errors.price ? colors.error : colors.outline,
                },
              ]}
            />
          </View>
          {errors.price && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errors.price}
            </Text>
          )}
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t.templates.category} {t.templates.required}
          </Text>
          <View style={styles.categoryGrid}>
            {GROCERY_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.value}
                onPress={() => setCategory(cat.value)}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor:
                      category === cat.value ? colors.primary : colors.surface,
                    borderColor: colors.outline,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: category === cat.value ? "#fff" : colors.text,
                    },
                  ]}
                >
                  {t.categories[cat.value as keyof typeof t.categories]}
                </Text>
              </Pressable>
            ))}
          </View>
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
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
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
