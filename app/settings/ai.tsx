import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { SettingItem } from "@/features/settings/components/setting-item";
import { usePageTransition } from "@/utils/animations";
import { triggerLightHaptic } from "@/utils/haptics";
import {
  AiMicIcon,
  ArtificialIntelligence04Icon,
  InformationCircleIcon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type ApiKeyType = "gemini" | "elevenlabs";

interface ApiKeyFormValues {
  apiKeyInput: string;
}

export default function AiSettings() {
  const {
    settings,
    updateApiKey,
    updateElevenLabsApiKey,
    colorScheme,
    t,
    templates,
    smartSuggestionsEnabled,
    toggleSmartSuggestions,
    formatNumber,
  } = useApp();
  const colors = Colors[colorScheme];
  const isBangla = settings.language === "bn";
  const pageTransitionStyle = usePageTransition();

  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [activeApiKeyType, setActiveApiKeyType] = useState<ApiKeyType>("gemini");

  const { control, handleSubmit, reset, setValue } = useForm<ApiKeyFormValues>({
    defaultValues: {
      apiKeyInput: "",
    },
  });

  const isGeminiApiKeyModal = activeApiKeyType === "gemini";
  const activeStoredApiKey = isGeminiApiKeyModal
    ? settings.geminiApiKey
    : settings.elevenLabsApiKey;
  const hasActiveStoredApiKey = !!activeStoredApiKey?.trim();

  const openApiKeyModal = (apiKeyType: ApiKeyType) => {
    setActiveApiKeyType(apiKeyType);
    reset({
      apiKeyInput:
        apiKeyType === "gemini"
          ? settings.geminiApiKey || ""
          : settings.elevenLabsApiKey || "",
    });
    setIsApiKeyModalVisible(true);
  };

  const handleApiKeySave = handleSubmit(({ apiKeyInput }) => {
    const trimmedApiKey = apiKeyInput.trim();
    if (activeApiKeyType === "gemini") {
      updateApiKey(trimmedApiKey);
    } else {
      updateElevenLabsApiKey(trimmedApiKey);
    }

    setIsApiKeyModalVisible(false);
    Alert.alert(
      t.alerts.successTitle,
      trimmedApiKey ? t.settings.apiKeySaved : t.settings.usingBuiltInApi,
    );
  });

  const handleApiKeyRemove = () => {
    Alert.alert(
      t.settings.removeApiKeyConfirmTitle,
      t.settings.removeApiKeyConfirmMessage,
      [
        { text: t.form.cancel, style: "cancel" },
        {
          text: t.settings.removeApiKey,
          style: "destructive",
          onPress: () => {
            if (activeApiKeyType === "gemini") {
              updateApiKey("");
            } else {
              updateElevenLabsApiKey("");
            }

            setValue("apiKeyInput", "");
            setIsApiKeyModalVisible(false);
            Alert.alert(t.alerts.successTitle, t.settings.apiKeyRemoved);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      testID="screen-settings-ai"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Animated.View style={[styles.screenTransition, pageTransitionStyle]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            testID="ai-settings-back-button"
          >
            <Text style={[styles.backText, { color: colors.primary }]}>
              ← {t.templates.back}
            </Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t.settings.aiMenu}
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
              {t.settings.aiAndSmartFeatures}
            </Text>

            <SettingItem
              icon={InformationCircleIcon}
              title={t.settings.manageTemplates}
              value={`${formatNumber(templates.length)} ${t.templates.title}`}
              onPress={() => router.push("/templates")}
              testID="ai-settings-manage-templates-item"
            />

            <SettingItem
              icon={ArtificialIntelligence04Icon}
              title={t.settings.geminiApiKey}
              value={settings.geminiApiKey ? "••••••••" : t.settings.off}
              onPress={() => openApiKeyModal("gemini")}
              testID="ai-settings-gemini-key-item"
            />

            <SettingItem
              icon={AiMicIcon}
              title={t.settings.elevenLabsApiKey}
              value={settings.elevenLabsApiKey ? "••••••••" : t.settings.off}
              onPress={() => openApiKeyModal("elevenlabs")}
              testID="ai-settings-elevenlabs-key-item"
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
              testID="ai-settings-enable-learning-item"
            />
          </View>
        </ScrollView>

        <Modal
          animationType="fade"
          transparent
          visible={isApiKeyModalVisible}
          onRequestClose={() => setIsApiKeyModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalContent, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isGeminiApiKeyModal
                  ? t.settings.geminiApiKey
                  : t.settings.elevenLabsApiKey}
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.textSecondary }]}
              >
                {isGeminiApiKeyModal
                  ? t.settings.geminiApiKeyDesc
                  : t.settings.elevenLabsApiKeyDesc}
              </Text>

              <Controller
                control={control}
                name="apiKeyInput"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    testID="ai-settings-api-key-input"
                    style={[
                      styles.input,
                      {
                        borderColor: colors.outline,
                        color: colors.text,
                        backgroundColor: colors.background,
                      },
                    ]}
                    placeholder={
                      isGeminiApiKeyModal
                        ? t.settings.enterGeminiApiKey
                        : t.settings.enterElevenLabsApiKey
                    }
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    onKeyPress={() => triggerLightHaptic()}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />

              <View style={styles.modalButtons}>
                {hasActiveStoredApiKey && (
                  <Pressable
                    style={[
                      styles.modalButton,
                      styles.removeButton,
                      { borderColor: colors.error },
                    ]}
                    onPress={handleApiKeyRemove}
                    testID="ai-settings-remove-api-key-button"
                  >
                    <Text style={[styles.modalButtonText, { color: colors.error }]}>
                      {t.settings.removeApiKey}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsApiKeyModalVisible(false)}
                  testID="ai-settings-cancel-api-key-button"
                >
                  <Text style={[styles.modalButtonText, { color: colors.primary }]}>
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
                  testID="ai-settings-save-api-key-button"
                >
                  <Text style={[styles.modalButtonText, { color: colors.onPrimary }]}>
                    {t.form.save}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
  removeButton: {
    borderWidth: 1,
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
