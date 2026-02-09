import { Toast } from "@/components/ui/toast";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { SettingItem } from "@/features/settings/components/setting-item";
import { usePageTransition } from "@/utils/animations";
import { triggerHeavyHaptic } from "@/utils/haptics";
import { useSampleData } from "@/utils/sample-data";
import {
  ArtificialIntelligence04Icon,
  ComputerIcon,
  Delete02Icon,
  InformationCircleIcon,
  Money01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import packageJson from "../../package.json";

export default function Settings() {
  const {
    settings,
    colorScheme,
    t,
    smartSuggestionsEnabled,
    clearAllData,
  } = useApp();
  const colors = Colors[colorScheme];
  const isBangla = settings.language === "bn";
  const { addSampleExpenses, addSampleGroceryItems } = useSampleData();
  const pageTransitionStyle = usePageTransition();

  const themeLabelMap = {
    light: t.settings.themeLight,
    dark: t.settings.themeDark,
    system: t.settings.themeSystem,
  } as const;

  const customizationValue = `${settings.currency.code} • ${themeLabelMap[settings.theme]} • ${settings.language === "bn" ? "বাংলা" : "English"}`;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Animated.View style={[styles.screenTransition, pageTransitionStyle]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t.settings.title}
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View
            style={[styles.appCard, { backgroundColor: colors.primaryContainer }]}
          >
            <View
              style={[
                styles.appIconContainer,
                { backgroundColor: colors.primary },
              ]}
            >
              <HugeiconsIcon
                icon={Money01Icon}
                size={32}
                color={colors.onPrimary}
                strokeWidth={1.5}
              />
            </View>
            <Text style={[styles.appName, { color: colors.onPrimaryContainer }]}>
              Amar Hisab
            </Text>
            <Text
              style={[styles.appTagline, { color: colors.onPrimaryContainer }]}
            >
              {t.settings.appTagline}
            </Text>
          </View>

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
              icon={ComputerIcon}
              title={t.settings.customization}
              value={customizationValue}
              onPress={() => router.push("/settings/customization")}
            />

            <SettingItem
              icon={ArtificialIntelligence04Icon}
              title={t.settings.aiMenu}
              value={smartSuggestionsEnabled ? t.settings.on : t.settings.off}
              onPress={() => router.push("/settings/ai")}
            />
          </View>

          <View style={styles.settingsSection}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textSecondary },
                isBangla && styles.sectionTitleBangla,
              ]}
            >
              {t.settings.about}
            </Text>

            <SettingItem
              icon={InformationCircleIcon}
              title={t.settings.version}
              value={packageJson.version}
            />
          </View>

          <View style={styles.settingsSection}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textSecondary },
                isBangla && styles.sectionTitleBangla,
              ]}
            >
              {t.settings.developerTools}
            </Text>

            <Pressable
              onPress={() => {
                addSampleExpenses();
                addSampleGroceryItems();
                Alert.alert(t.alerts.successTitle, t.alerts.sampleDataAdded);
              }}
              style={({ pressed }) => [
                styles.devButton,
                {
                  backgroundColor: colors.secondaryContainer,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.devButtonText,
                  { color: colors.onSecondaryContainer },
                ]}
              >
                {t.settings.addSampleData}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Alert.alert(
                  t.settings.clearAllDataConfirmTitle,
                  t.settings.clearAllDataConfirmMessage,
                  [
                    {
                      text: t.form.cancel,
                      style: "cancel",
                    },
                    {
                      text: t.settings.deleteAll,
                      style: "destructive",
                      onPress: () => {
                        clearAllData();
                        Alert.alert(t.alerts.successTitle, t.settings.dataCleared);
                      },
                    },
                  ],
                  { cancelable: true },
                );
              }}
              style={({ pressed }) => [
                styles.devButton,
                styles.devButtonDanger,
                {
                  backgroundColor: "#FF3B30",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.devButtonContent}>
                <HugeiconsIcon
                  icon={Delete02Icon}
                  size={18}
                  color="#FFFFFF"
                  strokeWidth={2}
                />
                <Text style={[styles.devButtonText, { color: "#FFFFFF" }]}>
                  {t.settings.clearAllData}
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.footerContainer}>
            <Text style={[styles.footer, { color: colors.textSecondary }]}>
              {t.settings.madeWith}{" "}
              <Text
                style={[styles.footerLink, { color: colors.primary }]}
                onPress={() => {
                  triggerHeavyHaptic();
                  void Linking.openURL("https://github.com/Frazix12");
                }}
              >
                Frazix
              </Text>
            </Text>
          </View>
        </ScrollView>

        <Toast />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  appCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 32,
  },
  appIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 34,
  },
  appTagline: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
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
  footer: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 20,
    marginBottom: 40,
    lineHeight: 20,
  },
  footerContainer: {
    alignItems: "center",
  },
  footerLink: {
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  devButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  devButtonText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
  devButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  devButtonDanger: {
    marginTop: 12,
  },
});
