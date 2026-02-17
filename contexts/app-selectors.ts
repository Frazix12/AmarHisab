import {
  useExpenseSlice,
  useGrocerySlice,
  useI18nSlice,
  useLearningSlice,
  useSettingsSlice,
  useTemplateSlice,
  useThemeSlice,
} from "@/contexts/app-context";

export const useTheme = () => {
  return useThemeSlice().colorScheme;
};

export const useI18n = () => {
  return useI18nSlice();
};

export const useExpenseDomain = () => {
  return useExpenseSlice();
};

export const useGroceryDomain = () => {
  return useGrocerySlice();
};

export const useSettingsDomain = () => {
  return useSettingsSlice();
};

export const useTemplateDomain = () => {
  return useTemplateSlice();
};

export const useLearningDomain = () => {
  return useLearningSlice();
};
