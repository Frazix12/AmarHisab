/**
 * Material Design 3-ish Color System (Refined)
 * Friendlier contrast, softer neutrals, more complete roles for real UI usage.
 */

import { Platform } from "react-native";

export const Colors = {
  light: {
    // Primary (Teal)
    primary: "#00796B",
    onPrimary: "#FFFFFF",
    primaryContainer: "#B2DFDB",
    onPrimaryContainer: "#00352F",

    // Secondary (Amber)
    secondary: "#FF8F00",
    onSecondary: "#1F1400",
    secondaryContainer: "#FFE0B2",
    onSecondaryContainer: "#3A2500",

    // Tertiary (Indigo)
    tertiary: "#5E35B1",
    onTertiary: "#FFFFFF",
    tertiaryContainer: "#D1C4E9",
    onTertiaryContainer: "#24124F",

    // Background & surfaces
    background: "#FAFAFA",
    onBackground: "#1A1C18",

    surface: "#FFFFFF",
    onSurface: "#1A1C18",
    surfaceVariant: "#F1F3F4",
    onSurfaceVariant: "#3F4448",

    // Extra surface roles (handy for MD3-ish elevation & overlays)
    surfaceTint: "#00796B",
    inverseSurface: "#2F3133",
    inverseOnSurface: "#F1F3F4",

    // App-friendly aliases
    card: "#FFFFFF",
    cardMuted: "#F6F7F8",
    divider: "#E6E8EB",
    scrim: "rgba(0,0,0,0.32)",
    placeholder: "#8A9096",

    // Outlines (softer)
    outline: "#DADCE0",
    outlineVariant: "#C9CDD2",

    // Text
    text: "#1A1C18",
    textSecondary: "#5F6368",
    textTertiary: "#7A8086",

    // Semantic colors (add proper on* pairs)
    error: "#B3261E",
    onError: "#FFFFFF",
    errorContainer: "#F9DEDC",
    onErrorContainer: "#410E0B",

    success: "#2E7D32",
    onSuccess: "#FFFFFF",
    successContainer: "#C8E6C9",
    onSuccessContainer: "#0F2B12",

    warning: "#B15D00",
    onWarning: "#FFFFFF",
    warningContainer: "#FFE0B2",
    onWarningContainer: "#3A2500",

    info: "#1565C0",
    onInfo: "#FFFFFF",
    infoContainer: "#D6E4FF",
    onInfoContainer: "#0B1B3A",

    // Navigation / icons
    tint: "#00796B",
    tabIconDefault: "#7C8A93",
    tabIconSelected: "#00796B",
    icon: "#5F6368",

    // Elevation tokens (light theme = subtle grays)
    shadow: "#000000",
    elevation1: "#FFFFFF",
    elevation2: "#F7F8F9",
    elevation3: "#F1F3F4",
  },

  dark: {
    // Primary (Teal)
    primary: "#4DB6AC",
    onPrimary: "#00322B",
    primaryContainer: "#005047",
    onPrimaryContainer: "#A7FFEB",

    // Secondary (Amber)
    secondary: "#FFC46B",
    onSecondary: "#2A1A00",
    secondaryContainer: "#5A3A00",
    onSecondaryContainer: "#FFE1B6",

    // Tertiary (Indigo)
    tertiary: "#C7B7F5",
    onTertiary: "#2A184C",
    tertiaryContainer: "#4A2AA3",
    onTertiaryContainer: "#E8DDFF",

    // Background & surfaces
    background: "#121212",
    onBackground: "#E6E1E5",

    surface: "#1A1A1A",
    onSurface: "#E6E1E5",
    surfaceVariant: "#262A2E",
    onSurfaceVariant: "#C7C9CC",

    // Extra surface roles
    surfaceTint: "#4DB6AC",
    inverseSurface: "#E6E1E5",
    inverseOnSurface: "#1A1A1A",

    // App-friendly aliases
    card: "#1E1E1E",
    cardMuted: "#232323",
    divider: "#2F3337",
    scrim: "rgba(0,0,0,0.55)",
    placeholder: "#9AA0A6",

    // Outlines (not too contrasty)
    outline: "#3A3F44",
    outlineVariant: "#2B2F33",

    // Text
    text: "#E6E1E5",
    textSecondary: "#C7C9CC",
    textTertiary: "#AEB3B7",

    // Semantic colors
    error: "#F2B8B5",
    onError: "#601410",
    errorContainer: "#8C1D18",
    onErrorContainer: "#F9DEDC",

    success: "#7CE081",
    onSuccess: "#0F2B12",
    successContainer: "#1F4A23",
    onSuccessContainer: "#C8E6C9",

    warning: "#FFB55A",
    onWarning: "#2A1A00",
    warningContainer: "#5A3A00",
    onWarningContainer: "#FFE0B2",

    info: "#9FC2FF",
    onInfo: "#0B1B3A",
    infoContainer: "#103A76",
    onInfoContainer: "#D6E4FF",

    // Navigation / icons
    tint: "#4DB6AC",
    tabIconDefault: "#95A3AD",
    tabIconSelected: "#4DB6AC",
    icon: "#C7C9CC",

    // Elevation tokens (dark theme = slightly brighter layers)
    shadow: "#000000",
    elevation1: "#1E1E1E",
    elevation2: "#242424",
    elevation3: "#2B2B2B",
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    // Note: RN Android expects actual font families unless using system defaults.
    // Keeping as generic fallbacks for cross-platform simplicity.
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
