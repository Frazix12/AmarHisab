import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { SettingSelectionModal } from "@/features/settings/components/setting-selection-modal";
import { SettingItem } from "@/features/settings/components/setting-item";
import { CURRENCIES } from "@/types";
import { usePageTransition } from "@/utils/animations";
import {
  ComputerIcon,
  Money01Icon,
  Moon02Icon,
  Sun03Icon,
  TranslateIcon,
} from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type ActiveModalType = "none" | "currency" | "theme" | "language";
type ThemeType = "light" | "dark" | "system";
const THEME_VALUES = new Set(["light", "dark", "system"]);

const isThemeType = (value: string): value is ThemeType =>
  THEME_VALUES.has(value);

export default function CustomizationSettings() {
  const {
    settings,
    updateCurrency,
    updateTheme,
    updateLanguage,
    colorScheme,
    t,
  } = useApp();
  const colors = Colors[colorScheme];
  const isBangla = settings.language === "bn";
  const pageTransitionStyle = usePageTransition();

  const [activeModal, setActiveModal] = useState<ActiveModalType>("none");

  const getThemeDisplayName = () => {
    switch (settings.theme) {
      case "light":
        return t.settings.themeLight;
      case "dark":
        return t.settings.themeDark;
      case "system":
        return t.settings.themeSystem;
      default:
        return t.settings.themeSystem;
    }
  };

  const getThemeIcon = () => {
    switch (settings.theme) {
      case "light":
        return Sun03Icon;
      case "dark":
        return Moon02Icon;
      case "system":
        return ComputerIcon;
      default:
        return ComputerIcon;
    }
  };

  const currencyOptions = CURRENCIES.map((currency) => ({
    label: `${currency.name} (${currency.symbol})`,
    value: currency.code,
    icon: Money01Icon,
  }));

  const themeOptions = [
    { label: t.settings.themeLight, value: "light", icon: Sun03Icon },
    { label: t.settings.themeDark, value: "dark", icon: Moon02Icon },
    { label: t.settings.themeSystem, value: "system", icon: ComputerIcon },
  ];

  const languageOptions = [
    { label: "English", value: "en", icon: TranslateIcon },
    { label: "বাংলা (Bangla)", value: "bn", icon: TranslateIcon },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Animated.View style={[styles.screenTransition, pageTransitionStyle]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.primary }]}>
              ← {t.templates.back}
            </Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t.settings.customization}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.settingsSection}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textSecondary },
                isBangla && styles.sectionTitleBangla,
              ]}
            >
              {t.settings.preferences}
            </Text>

            <SettingItem
              icon={Money01Icon}
              title={t.settings.currency}
              value={`${settings.currency.symbol} ${settings.currency.code}`}
              onPress={() => setActiveModal("currency")}
            />

            <SettingItem
              icon={getThemeIcon()}
              title={t.settings.theme}
              value={getThemeDisplayName()}
              onPress={() => setActiveModal("theme")}
            />

            <SettingItem
              icon={TranslateIcon}
              title={t.settings.language}
              value={settings.language === "bn" ? "বাংলা" : "English"}
              onPress={() => setActiveModal("language")}
            />
          </View>
        </ScrollView>

        <SettingSelectionModal
          visible={activeModal === "currency"}
          onClose={() => setActiveModal("none")}
          title={t.settings.currency}
          options={currencyOptions}
          currentValue={settings.currency.code}
          onSelect={(value) => {
            const currency = CURRENCIES.find((entry) => entry.code === value);
            if (currency) {
              updateCurrency(currency);
            }
          }}
        />

        <SettingSelectionModal
          visible={activeModal === "theme"}
          onClose={() => setActiveModal("none")}
          title={t.settings.theme}
          options={themeOptions}
          currentValue={settings.theme}
          onSelect={(value) => {
            if (isThemeType(value)) {
              updateTheme(value);
            }
          }}
        />

        <SettingSelectionModal
          visible={activeModal === "language"}
          onClose={() => setActiveModal("none")}
          title={t.settings.language}
          options={languageOptions}
          currentValue={settings.language}
          onSelect={(value) => updateLanguage(value)}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenTransition: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    paddingVertical: 4,
    minWidth: 64,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  headerPlaceholder: {
    width: 64,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  settingsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  sectionTitleBangla: {
    textTransform: "none",
    letterSpacing: 0,
    lineHeight: 18,
  },
});
