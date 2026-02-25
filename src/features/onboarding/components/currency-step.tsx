import React from "react";
import { Text, Pressable, FlatList, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useApp } from "@/contexts/app-context";
import { Colors, Fonts } from "@/constants/theme";
import { CURRENCIES } from "@/types";
import { useOnboardingStepAnimation } from "@/features/onboarding/animations";

interface CurrencyStepProps {
  isActive: boolean;
}

export function CurrencyStep({ isActive }: CurrencyStepProps) {
  const { colorScheme, t, settings, updateCurrency } = useApp();
  const colors = Colors[colorScheme];
  const { containerStyle, titleStyle, bodyStyle } =
    useOnboardingStepAnimation(isActive);

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.Text
        style={[
          styles.title,
          { color: colors.text, fontFamily: Fonts.sans },
          titleStyle,
        ]}
      >
        {t.onboarding.chooseCurrency}
      </Animated.Text>
      <Animated.Text
        style={[styles.subtitle, { color: colors.textSecondary }, bodyStyle]}
      >
        {t.onboarding.chooseCurrencySubtitle}
      </Animated.Text>
      <Animated.View style={[styles.listContainer, bodyStyle]}>
        <FlatList
          data={CURRENCIES}
          numColumns={2}
          keyExtractor={(item) => item.code}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => {
            const isSelected = settings.currency.code === item.code;
            return (
              <Pressable
                onPress={() => updateCurrency(item)}
                style={[
                  styles.currencyCard,
                  {
                    borderColor: isSelected ? colors.primary : colors.outline,
                    backgroundColor: isSelected
                      ? colors.primaryContainer
                      : colors.surface,
                  },
                ]}
                accessibilityLabel={`${item.name} ${item.code}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.currencySymbol, { color: colors.text }]}>
                  {item.symbol}
                </Text>
                <Text style={[styles.currencyCode, { color: colors.text }]}>
                  {item.code}
                </Text>
                <Text
                  style={[
                    styles.currencyName,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  listContainer: {
    width: "100%",
    marginTop: 8,
  },
  columnWrapper: {
    gap: 10,
    marginBottom: 10,
  },
  currencyCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    alignItems: "flex-start",
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  currencyCode: {
    fontSize: 14,
    fontWeight: "600",
  },
  currencyName: {
    fontSize: 12,
    marginTop: 2,
  },
});
