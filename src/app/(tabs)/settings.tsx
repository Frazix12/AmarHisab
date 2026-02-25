import { showNotification } from "@/services/notifications";
import { resetOnboardingCompleted } from "@/services/storage";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import {
  useI18n,
  useLearningDomain,
  useSettingsDomain,
  useTheme,
} from "@/contexts/app-selectors";
import { SettingItem } from "@/features/settings/components/setting-item";
import { usePageTransition } from "@/utils/animations";
import { triggerHeavyHaptic } from "@/utils/haptics";
import { useSampleData } from "@/utils/sample-data";
import { AnalyticsEvents, captureError, trackEvent } from "@/services/analytics";
import {
  Add01Icon,
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
import packageJson from "../../../package.json";

export default function Settings() {
  const colorScheme = useTheme();
  const { t } = useI18n();
  const { settings, clearAllData } = useSettingsDomain();
  const { smartSuggestionsEnabled } = useLearningDomain();
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
        <View style={styles.header}>
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
              onPress={() => {
                trackEvent(AnalyticsEvents.SETTINGS_NAVIGATE, {
                  destination: "/settings/customization",
                });
                router.push("/settings/customization");
              }}
            />

            <SettingItem
              icon={ArtificialIntelligence04Icon}
              title={t.settings.aiMenu}
              value={smartSuggestionsEnabled ? t.settings.on : t.settings.off}
              onPress={() => {
                trackEvent(AnalyticsEvents.SETTINGS_NAVIGATE, {
                  destination: "/settings/ai",
                });
                router.push("/settings/ai");
              }}
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

          {__DEV__ ? (
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
              onPress={async () => {
                trackEvent(AnalyticsEvents.SAMPLE_DATA_ADD_CLICKED);
                try {
                  await addSampleExpenses();
                  await addSampleGroceryItems();

                  trackEvent(AnalyticsEvents.SAMPLE_DATA_ADDED);
                  showNotification(t.alerts.sampleDataAdded, {
                    type: "success",
                    title: t.alerts.successTitle,
                  });
                } catch (error) {
                  captureError(error, { context: "settings_add_sample_data" });
                  if (__DEV__) {
                    console.error("Failed to add sample data:", error);
                  }

                  trackEvent(AnalyticsEvents.SAMPLE_DATA_ADD_FAILED, {
                    error_type: error instanceof Error ? error.name : typeof error,
                  });
                  showNotification(
                    t.alerts.sampleDataAddFailed ||
                    "Failed to add sample data. Please try again.",
                    {
                      type: "error",
                      title: t.alerts.errorTitle,
                    },
                  );
                }
              }}
              style={({ pressed }) => [
                styles.devButton,
                {
                  backgroundColor: colors.secondaryContainer,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.devButtonContent}>
                <View style={styles.devButtonIcon}>
                  <HugeiconsIcon
                    icon={Add01Icon}
                    size={18}
                    color={colors.onSecondaryContainer}
                    strokeWidth={2}
                  />
                </View>
                <Text
                  style={[
                    styles.devButtonText,
                    { color: colors.onSecondaryContainer },
                  ]}
                >
                  {t.settings.addSampleData}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                Alert.alert(
                  t.settings.clearAllDataConfirmTitle,
                  `${t.settings.clearAllDataConfirmMessage}\n\nOnboarding progress will also be reset.`,
                  [
                    {
                      text: t.form.cancel,
                      style: "cancel",
                    },
                    {
                      text: t.settings.deleteAll,
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await clearAllData();
                          showNotification(t.settings.dataCleared, {
                            type: "success",
                            title: t.alerts.successTitle,
                          });
                        } catch (error) {
                          captureError(error, { context: "settings_clear_all_data" });
                          if (__DEV__) {
                            console.error("Failed to clear all data:", error);
                          }
                          showNotification(
                            t.alerts.dataClearFailed ||
                            "Failed to clear data. Please try again.",
                            {
                              type: "error",
                              title: t.alerts.errorTitle,
                            },
                          );
                        }
                      },
                    },
                  ],
                  { cancelable: true },
                );
              }}
              style={({ pressed }) => [
                styles.devButton,
                styles.devButtonSpacing,
                {
                  backgroundColor: "#FF3B30",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.devButtonContent}>
                <View style={styles.devButtonIcon}>
                  <HugeiconsIcon
                    icon={Delete02Icon}
                    size={18}
                    color="#FFFFFF"
                    strokeWidth={2}
                  />
                </View>
                <Text style={[styles.devButtonText, { color: "#FFFFFF" }]}>
                  {t.settings.clearAllData}
                </Text>
              </View>
            </Pressable>

            {__DEV__ && (
              <Pressable
                onPress={async () => {
                  await resetOnboardingCompleted();
                  showNotification("Onboarding reset — restart app", {
                    type: "success",
                    title: "Dev",
                  });
                }}
                style={({ pressed }) => [
                  styles.devButton,
                  styles.devButtonSpacing,
                  {
                    backgroundColor: colors.secondaryContainer,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.devButtonContent}>
                  <View style={styles.devButtonIcon}>
                    <HugeiconsIcon
                      icon={ComputerIcon}
                      size={18}
                      color={colors.onSecondaryContainer}
                      strokeWidth={2}
                    />
                  </View>
                  <Text
                    style={[
                      styles.devButtonText,
                      { color: colors.onSecondaryContainer },
                    ]}
                  >
                    Reset Onboarding
                  </Text>
                </View>
              </Pressable>
            )}
            </View>
          ) : null}

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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
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
  devButtonContent: {
    width: "100%",
    minHeight: 22,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  devButtonIcon: {
    position: "absolute",
    left: 0,
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  devButtonText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
  },
  devButtonSpacing: {
    marginTop: 12,
  },
});
