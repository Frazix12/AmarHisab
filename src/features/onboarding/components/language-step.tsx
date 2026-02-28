import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useApp } from "@/contexts/app-context";
import { Colors, Fonts } from "@/constants/theme";
import { useOnboardingStepAnimation } from "@/features/onboarding/animations";

interface LanguageStepProps {
  isActive: boolean;
}

const LANGUAGES = [
  { code: "en" as const, nativeLabel: "English" },
  { code: "bn" as const, nativeLabel: "বাংলা" },
];

export function LanguageStep({ isActive }: LanguageStepProps) {
  const { colorScheme, t, settings, updateLanguage } = useApp();
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
        {t.onboarding.chooseLanguage}
      </Animated.Text>
      <Animated.Text
        style={[styles.subtitle, { color: colors.textSecondary }, bodyStyle]}
      >
        {t.onboarding.chooseLanguageSubtitle}
      </Animated.Text>
      <Animated.View style={[styles.optionsContainer, bodyStyle]}>
        {LANGUAGES.map((lang) => {
          const isSelected = settings.language === lang.code;
          return (
            <Pressable
              key={lang.code}
              onPress={() => updateLanguage(lang.code)}
              style={[
                styles.card,
                {
                  borderColor: isSelected ? colors.primary : colors.outline,
                  backgroundColor: isSelected
                    ? colors.primaryContainer
                    : colors.surface,
                },
              ]}
              accessibilityLabel={lang.nativeLabel}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.cardContent}>
                <Text style={[styles.cardLabel, { color: colors.text }]}>
                  {lang.nativeLabel}
                </Text>
                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor: isSelected
                        ? colors.primary
                        : colors.outline,
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
