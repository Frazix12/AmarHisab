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
    primaryContainer: "#B7E1DB",
    onPrimaryContainer: "#003A33",

    // Secondary (Sage)
    secondary: "#C1C8A7",
    onSecondary: "#1B1F15",
    secondaryContainer: "#DCE2C9",
    onSecondaryContainer: "#2D3325",

    // Tertiary (Accent Green)
    tertiary: "#97B284",
    onTertiary: "#10220D",
    tertiaryContainer: "#CFE0C4",
    onTertiaryContainer: "#23311E",

    // Background & surfaces
    background: "#ECECEC",
    onBackground: "#070404",

    surface: "#F7F7F7",
    onSurface: "#070404",
    surfaceVariant: "#E1E2DE",
    onSurfaceVariant: "#3E4336",

    // Extra surface roles (handy for MD3-ish elevation & overlays)
    surfaceTint: "#00796B",
    inverseSurface: "#2A2A2A",
    inverseOnSurface: "#ECECEC",

    // App-friendly aliases
    card: "#F8F8F8",
    cardMuted: "#EFF0EC",
    divider: "#D4D6D0",
    scrim: "rgba(0,0,0,0.32)",
    placeholder: "#6D7460",

    // Outlines (softer)
    outline: "#C7CCC0",
    outlineVariant: "#B8BDAF",

    // Text
    text: "#070404",
    textSecondary: "#4A503F",
    textTertiary: "#69715C",

    // Semantic colors (add proper on* pairs)
    error: "#E53935",
    onError: "#FFFFFF",
    errorContainer: "#F9DEDC",
    onErrorContainer: "#410E0B",

    success: "#00897B",
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
    tabIconDefault: "#7C8272",
    tabIconSelected: "#00796B",
    icon: "#5A6150",

    // Elevation tokens (light theme = subtle grays)
    shadow: "#000000",
    elevation1: "#F7F7F7",
    elevation2: "#F1F2EE",
    elevation3: "#EAECE6",
  },

  dark: {
    // Primary (Teal)
    primary: "#53C6B9",
    onPrimary: "#0E2220",
    primaryContainer: "#1F615A",
    onPrimaryContainer: "#C8F2EC",

    // Secondary (Olive)
    secondary: "#5E6C3D",
    onSecondary: "#F5EBEB",
    secondaryContainer: "#394427",
    onSecondaryContainer: "#DCE6C2",

    // Tertiary (Accent Green)
    tertiary: "#84AD71",
    onTertiary: "#13210F",
    tertiaryContainer: "#35512B",
    onTertiaryContainer: "#D7E9CF",

    // Background & surfaces
    background: "#121212",
    onBackground: "#F5EBEB",

    surface: "#1A1A1A",
    onSurface: "#F5EBEB",
    surfaceVariant: "#252822",
    onSurfaceVariant: "#C2C8B6",

    // Extra surface roles
    surfaceTint: "#53C6B9",
    inverseSurface: "#F5EBEB",
    inverseOnSurface: "#1A1A1A",

    // App-friendly aliases
    card: "#1D1F1C",
    cardMuted: "#232621",
    divider: "#343A2D",
    scrim: "rgba(0,0,0,0.55)",
    placeholder: "#9CA892",

    // Outlines (not too contrasty)
    outline: "#49523A",
    outlineVariant: "#363D2D",

    // Text
    text: "#F5EBEB",
    textSecondary: "#C9D2BC",
    textTertiary: "#A6B097",

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
    tint: "#53C6B9",
    tabIconDefault: "#8D987F",
    tabIconSelected: "#53C6B9",
    icon: "#C9D2BC",

    // Elevation tokens (dark theme = slightly brighter layers)
    shadow: "#000000",
    elevation1: "#1D1F1C",
    elevation2: "#242820",
    elevation3: "#2B3026",
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
