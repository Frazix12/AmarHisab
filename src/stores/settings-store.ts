import { create } from "zustand";
import { CURRENCIES, Currency, UserSettings } from "@/types";
import { setElevenLabsApiKey } from "@/services/ai/elevenlabs";
import {
  trackEvent,
  captureError,
  identifyUser,
  resetAnalytics,
  setSuperProperties,
  AnalyticsEvents,
} from "@/services/analytics";
import {
  clearAllData as clearStorageData,
  saveSettings,
  ensureAnalyticsId,
} from "@/services/storage";
import { LearningStorage } from "@/features/templates/services/learning-storage";

const DEFAULT_SETTINGS: UserSettings = {
  currency: CURRENCIES[0],
  theme: "light",
  language: "en",
};

type GeminiModule = typeof import("@/services/ai/gemini");
let geminiModulePromise: Promise<GeminiModule> | null = null;

function setGeminiApiKeyLazy(apiKey: string): void {
  if (!geminiModulePromise) {
    geminiModulePromise = import("@/services/ai/gemini");
  }

  void geminiModulePromise
    .then((geminiModule) => {
      geminiModule.setGeminiApiKey(apiKey);
    })
    .catch((error) => {
    console.error("Failed to load Gemini module:", error);
    });
}

interface SettingsState {
  settings: UserSettings;
  updateCurrency: (currency: Currency) => void;
  updateTheme: (theme: "light" | "dark" | "system") => void;
  updateLanguage: (language: string) => void;
  updateApiKey: (apiKey: string) => void;
  updateElevenLabsApiKey: (apiKey: string) => void;
  clearAllData: () => Promise<void>;
  /** Internal: called by AppProvider after DB load */
  _setSettings: (settings: UserSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,

  _setSettings: (settings) => set({ settings }),

  updateCurrency: (currency) => {
    const previous = get().settings;
    const next: UserSettings = { ...previous, currency };
    set({ settings: next });
    void saveSettings(next).catch((e) =>
      console.error("Failed to save settings:", e),
    );
    trackEvent(AnalyticsEvents.CURRENCY_CHANGED, {
      setting_name: "currency",
      old_value: previous.currency.code,
      new_value: currency.code,
    });
    setSuperProperties({ currency_code: currency.code });
  },

  updateTheme: (theme) => {
    const previous = get().settings;
    const next: UserSettings = { ...previous, theme };
    set({ settings: next });
    void saveSettings(next).catch((e) =>
      console.error("Failed to save settings:", e),
    );
    trackEvent(AnalyticsEvents.THEME_CHANGED, {
      setting_name: "theme",
      old_value: previous.theme,
      new_value: theme,
    });
    setSuperProperties({ theme });
  },

  updateLanguage: (language) => {
    const previous = get().settings;
    const next: UserSettings = { ...previous, language };
    set({ settings: next });
    void saveSettings(next).catch((e) =>
      console.error("Failed to save settings:", e),
    );
    trackEvent(AnalyticsEvents.LANGUAGE_CHANGED, {
      setting_name: "language",
      old_value: previous.language,
      new_value: language,
    });
    setSuperProperties({ language });
  },

  updateApiKey: (apiKey) => {
    const action = apiKey.trim().length > 0 ? "set" : "remove";
    const next: UserSettings = { ...get().settings, geminiApiKey: apiKey };
    set({ settings: next });
    void saveSettings(next).catch((e) =>
      console.error("Failed to save settings:", e),
    );
    setGeminiApiKeyLazy(apiKey);
    trackEvent(AnalyticsEvents.API_KEY_UPDATED, { key_type: "gemini", action });
    setSuperProperties({ has_gemini_key: action === "set" });
  },

  updateElevenLabsApiKey: (apiKey) => {
    const action = apiKey.trim().length > 0 ? "set" : "remove";
    const next: UserSettings = {
      ...get().settings,
      elevenLabsApiKey: apiKey,
    };
    set({ settings: next });
    void saveSettings(next).catch((e) =>
      console.error("Failed to save settings:", e),
    );
    setElevenLabsApiKey(apiKey);
    trackEvent(AnalyticsEvents.API_KEY_UPDATED, {
      key_type: "elevenlabs",
      action,
    });
    setSuperProperties({ has_elevenlabs_key: action === "set" });
  },

  clearAllData: async () => {
    try {
      await clearStorageData();
      if (typeof LearningStorage.clear === "function") {
        await LearningStorage.clear();
      }
      set({ settings: DEFAULT_SETTINGS });
      setGeminiApiKeyLazy("");
      setElevenLabsApiKey("");
      trackEvent(AnalyticsEvents.DATA_CLEARED, { action: "clear_all_data" });
      await resetAnalytics();
      const analyticsId = await ensureAnalyticsId();
      identifyUser(analyticsId, {
        language: DEFAULT_SETTINGS.language,
        currency_code: DEFAULT_SETTINGS.currency.code,
        theme: DEFAULT_SETTINGS.theme,
      });
      setSuperProperties({
        language: DEFAULT_SETTINGS.language,
        currency_code: DEFAULT_SETTINGS.currency.code,
        theme: DEFAULT_SETTINGS.theme,
        smart_suggestions_enabled: true,
      });
    } catch (error) {
      console.error("Failed to clear data:", error);
      captureError(error, { context: "clear_all_data" });
      throw error instanceof Error ? error : new Error(String(error));
    }
  },
}));
