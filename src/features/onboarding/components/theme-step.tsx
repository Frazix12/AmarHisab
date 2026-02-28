import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useApp } from "@/contexts/app-context";
import { Colors, Fonts } from "@/constants/theme";
import { useOnboardingStepAnimation } from "@/features/onboarding/animations";

interface ThemeStepProps {
  isActive: boolean;
}

const THEMES = [
  { value: "light" as const, labelKey: "themeLight" as const },
  { value: "dark" as const, labelKey: "themeDark" as const },
  { value: "system" as const, labelKey: "themeSystem" as const },
];

export function ThemeStep({ isActive }: ThemeStepProps) {
  const { colorScheme, t, settings, updateTheme } = useApp();
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
        {t.onboarding.chooseTheme}
      </Animated.Text>
      <Animated.Text
        style={[styles.subtitle, { color: colors.textSecondary }, bodyStyle]}
      >
        {t.onboarding.chooseThemeSubtitle}
      </Animated.Text>
      <Animated.View
        style={[styles.optionsContainer, bodyStyle]}
        accessibilityRole="radiogroup"
      >
        {THEMES.map((theme) => {
          const isSelected = settings.theme === theme.value;
          return (
            <Pressable
              key={theme.value}
              onPress={() => updateTheme(theme.value)}
              style={[
                styles.card,
                {
                  borderColor: isSelected ? colors.primary : colors.outline,
                  backgroundColor: isSelected
                    ? colors.primaryContainer
                    : colors.surface,
                },
              ]}
              accessibilityLabel={t.settings[theme.labelKey]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.cardContent}>
                <Text style={[styles.cardLabel, { color: colors.text }]}>
                  {t.settings[theme.labelKey]}
                </Text>
                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor: isSelected ? colors.primary : colors.outline,
                    },
                  ]}
                >
                  {isSelected && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
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
  optionsContainer: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  card: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    paddingRight: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
