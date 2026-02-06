import { Toast } from "@/components/ui/toast";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { SettingSelectionModal } from "@/features/settings/components/setting-selection-modal";
import { CURRENCIES } from "@/types";
import { useSampleData } from "@/utils/sample-data";
import {
  ArtificialIntelligence04Icon,
  ComputerIcon,
  InformationCircleIcon,
  Money01Icon,
  Moon02Icon,
  Sun03Icon,
  TranslateIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import packageJson from "../../package.json";

interface SettingItemProps {
  icon: any;
  title: string;
  value?: string;
  onPress?: () => void;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  value,
  onPress,
}) => {
  const { colorScheme } = useApp();
  const colors = Colors[colorScheme];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingItem,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outline,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primaryContainer },
          ]}
        >
          <HugeiconsIcon
            icon={icon}
            size={22}
            color={colors.primary}
            strokeWidth={1.5}
          />
        </View>
        <Text
          style={[styles.settingTitle, { color: colors.text }]}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
      {value && (
        <Text
          style={[styles.settingValue, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {value}
        </Text>
      )}
    </Pressable>
  );
};

export default function Settings() {
  const {
    settings,
    updateCurrency,
    updateTheme,
    updateLanguage,
    colorScheme,
    t,
    templates,
    smartSuggestionsEnabled,
    toggleSmartSuggestions,
    clearAllData,
    formatNumber,
    updateApiKey,
  } = useApp();
  const colors = Colors[colorScheme];
  const isBangla = settings.language === "bn";
  const { addSampleExpenses, addSampleGroceryItems } = useSampleData();

  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [activeModal, setActiveModal] = useState<
    "none" | "currency" | "theme" | "language"
  >("none");

  const handleApiKeySave = () => {
    updateApiKey(apiKeyInput);
    setIsApiKeyModalVisible(false);
    Alert.alert(t.alerts.successTitle, t.settings.apiKeySaved);
  };

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

  // Modal Options
  const currencyOptions = CURRENCIES.map((c) => ({
    label: `${c.name} (${c.symbol})`,
    value: c.code,
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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t.settings.title}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* App Name Card */}
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

        {/* Settings Section */}
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

        {/* Smart Templates Section */}
        <View style={styles.settingsSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.textSecondary },
              isBangla && styles.sectionTitleBangla,
            ]}
          >
            {t.settings.aiAndSmartFeatures || "AI & Smart Features"}
          </Text>

          <SettingItem
            icon={InformationCircleIcon}
            title={t.settings.manageTemplates}
            value={`${formatNumber(templates.length)} ${t.templates.title}`}
            onPress={() => router.push("/templates")}
          />

          <SettingItem
            icon={ArtificialIntelligence04Icon}
            title={t.settings.geminiApiKey}
            value={settings.geminiApiKey ? "••••••••" : t.settings.off}
            onPress={() => {
              setApiKeyInput(settings.geminiApiKey || "");
              setIsApiKeyModalVisible(true);
            }}
          />

          <SettingItem
            icon={Sun03Icon}
            title={t.settings.enableLearning}
            value={smartSuggestionsEnabled ? t.settings.on : t.settings.off}
            onPress={() => {
              Alert.alert(
                t.settings.smartSuggestionsTitle,
                smartSuggestionsEnabled
                  ? t.settings.disableSmartSuggestions
                  : t.settings.enableSmartSuggestions,
                [
                  {
                    text: t.form.cancel,
                    style: "cancel",
                  },
                  {
                    text: smartSuggestionsEnabled
                      ? t.settings.disable
                      : t.settings.enable,
                    onPress: toggleSmartSuggestions,
                  },
                ],
              );
            }}
          />
        </View>

        {/* About Section */}
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

        {/* Developer Section (for testing) */}
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
            <Text style={[styles.devButtonText, { color: "#FFFFFF" }]}>
              🗑️ {t.settings.clearAllData}
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <Text style={[styles.footer, { color: colors.textSecondary }]}>
            {t.settings.madeWith}{" "}
            <Text
              style={[styles.footerLink, { color: colors.primary }]}
              onPress={() => Linking.openURL("https://github.com/Frazix12")}
            >
              Frazix
            </Text>
          </Text>
        </View>
      </ScrollView>

      {/* Settings Selection Modals */}
      <SettingSelectionModal
        visible={activeModal === "currency"}
        onClose={() => setActiveModal("none")}
        title={t.settings.currency}
        options={currencyOptions}
        currentValue={settings.currency.code}
        onSelect={(val) => {
          const currency = CURRENCIES.find((c) => c.code === val);
          if (currency) updateCurrency(currency);
        }}
      />

      <SettingSelectionModal
        visible={activeModal === "theme"}
        onClose={() => setActiveModal("none")}
        title={t.settings.theme}
        options={themeOptions}
        currentValue={settings.theme}
        onSelect={(val) => updateTheme(val as any)}
      />

      <SettingSelectionModal
        visible={activeModal === "language"}
        onClose={() => setActiveModal("none")}
        title={t.settings.language}
        options={languageOptions}
        currentValue={settings.language}
        onSelect={(val) => updateLanguage(val)}
      />

      {/* API Key Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isApiKeyModalVisible}
        onRequestClose={() => setIsApiKeyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t.settings.geminiApiKey}
            </Text>
            <Text
              style={[styles.modalSubtitle, { color: colors.textSecondary }]}
            >
              {t.settings.geminiApiKeyDesc}
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.outline,
                  color: colors.text,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder={t.settings.enterApiKey}
              placeholderTextColor={colors.textSecondary}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsApiKeyModalVisible(false)}
              >
                <Text
                  style={[styles.modalButtonText, { color: colors.primary }]}
                >
                  {t.form.cancel}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleApiKeySave}
              >
                <Text
                  style={[styles.modalButtonText, { color: colors.onPrimary }]}
                >
                  {t.form.save}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 2,
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
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    minHeight: 72,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    lineHeight: 22,
  },
  settingValue: {
    fontSize: 15,
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
    lineHeight: 20,
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
  devButtonDanger: {
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 26,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: "transparent",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
});
