import { useSettingsStore } from "@/stores/settings-store";
import { useExpenseStore } from "@/stores/expense-store";
import { useGroceryStore } from "@/stores/grocery-store";
import { useTemplateStore } from "@/stores/template-store";
import { useLearningStore } from "@/stores/learning-store";
import { useColorScheme } from "react-native";
import { getTranslation } from "@/services/i18n";
import { formatNumber as formatNumberUtil } from "@/utils/format";
import { useCallback } from "react";

export const useTheme = () => {
  const theme = useSettingsStore((s) => s.settings.theme);
  const nativeColorScheme = useColorScheme();
  return theme === "system" ? (nativeColorScheme ?? "light") : theme;
};

export const useI18n = () => {
  const language = useSettingsStore((s) => s.settings.language);
  const t = getTranslation(language);
  const formatNumber = useCallback(
    (value: number | string) => formatNumberUtil(value, language),
    [language],
  );
  return { t, formatNumber };
};

export const useExpenseDomain = () => useExpenseStore();
export const useGroceryDomain = () => useGroceryStore();
export const useSettingsDomain = () => useSettingsStore();
export const useTemplateDomain = () => useTemplateStore();
export const useLearningDomain = () => useLearningStore();
