import { Colors } from "@/constants/theme";
import { useTheme } from "@/contexts/app-selectors";
import { showToast } from "@/services/notifications";
import React, { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ToastMessage, {
  BaseToast,
  type BaseToastProps,
  ErrorToast,
  InfoToast,
} from "react-native-toast-message";

export const Toast: React.FC = () => {
  const colorScheme = useTheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const toastConfig = useMemo(
    () => {
      const isDark = colorScheme === "dark";
      const commonToastStyle = {
        backgroundColor: isDark ? colors.elevation3 : colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? colors.outlineVariant : colors.outline,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 10,
        elevation: isDark ? 4 : 2,
      };

      return {
      success: (props: BaseToastProps) => (
        <BaseToast
          {...props}
          style={{
            ...commonToastStyle,
            borderLeftColor: colors.success,
          }}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          text1Style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}
          text2Style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}
        />
      ),
      error: (props: BaseToastProps) => (
        <ErrorToast
          {...props}
          style={{
            ...commonToastStyle,
            borderLeftColor: colors.error,
          }}
          text1Style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}
          text2Style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}
        />
      ),
      info: (props: BaseToastProps) => (
        <InfoToast
          {...props}
          style={{
            ...commonToastStyle,
            borderLeftColor: colors.info,
          }}
          text1Style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}
          text2Style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}
        />
      ),
      warning: (props: BaseToastProps) => (
        <BaseToast
          {...props}
          style={{
            ...commonToastStyle,
            borderLeftColor: colors.warning,
          }}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          text1Style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}
          text2Style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}
        />
      ),
      hint: (props: BaseToastProps) => (
        <BaseToast
          {...props}
          style={{
            ...commonToastStyle,
            borderLeftColor: colors.primary,
          }}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          text1Style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}
          text2Style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}
        />
      ),
      };
    },
    [colorScheme, colors],
  );

  return (
    <ToastMessage
      config={toastConfig}
      position="top"
      topOffset={insets.top + 10}
      visibilityTime={2600}
    />
  );
};

export { showToast };
