/**
 * Material Design 3 Color System
 * Vibrant, modern color palette for Amar Hisab expense tracker
 */

import { Platform } from "react-native";

export const Colors = {
  light: {
    // Primary colors (Teal/Blue)
    primary: "#00796B",
    primaryContainer: "#B2DFDB",
    onPrimary: "#FFFFFF",
    onPrimaryContainer: "#004D40",

    // Secondary colors (Amber/Orange)
    secondary: "#FF6F00",
    secondaryContainer: "#FFE0B2",
    onSecondary: "#FFFFFF",
    onSecondaryContainer: "#E65100",

    // Tertiary colors
    tertiary: "#5E35B1",
    tertiaryContainer: "#D1C4E9",
    onTertiary: "#FFFFFF",
    onTertiaryContainer: "#311B92",

    // Surface colors
    background: "#FAFAFA",
    surface: "#FFFFFF",
    surfaceVariant: "#F5F5F5",
    onBackground: "#1A1C18",
    onSurface: "#1A1C18",
    onSurfaceVariant: "#44483D",

    // Semantic colors
    error: "#D32F2F",
    errorContainer: "#FFCDD2",
    onError: "#FFFFFF",
    success: "#388E3C",
    successContainer: "#C8E6C9",
    warning: "#F57C00",
    warningContainer: "#FFE0B2",
    info: "#1976D2",
    infoContainer: "#BBDEFB",

    // Outline and borders
    outline: "#E0E0E0",
    outlineVariant: "#C8C8C8",

    // Text colors
    text: "#1A1C18",
    textSecondary: "#5F6368",

    // Tab bar
    tint: "#00796B",
    tabIconDefault: "#78909C",
    tabIconSelected: "#00796B",
    icon: "#5F6368",

    // Card shadows and elevation
    shadow: "#000000",
    elevation1: "#FAFAFA",
    elevation2: "#F5F5F5",
    elevation3: "#EEEEEE",
  },
  dark: {
    // Primary colors (Teal/Blue)
    primary: "#4DB6AC",
    primaryContainer: "#00695C",
    onPrimary: "#003D33",
    onPrimaryContainer: "#A7FFEB",

    // Secondary colors (Amber/Orange)
    secondary: "#FFB74D",
    secondaryContainer: "#E65100",
    onSecondary: "#4E2D00",
    onSecondaryContainer: "#FFCC80",

    // Tertiary colors
    tertiary: "#B39DDB",
    tertiaryContainer: "#4527A0",
    onTertiary: "#2C1A52",
    onTertiaryContainer: "#D1C4E9",

    // Surface colors
    background: "#121212",
    surface: "#1E1E1E",
    surfaceVariant: "#2C2C2C",
    onBackground: "#E6E1E5",
    onSurface: "#E6E1E5",
    onSurfaceVariant: "#C7C5CA",

    // Semantic colors
    error: "#EF5350",
    errorContainer: "#B71C1C",
    onError: "#FFFFFF",
    success: "#66BB6A",
    successContainer: "#1B5E20",
    warning: "#FFA726",
    warningContainer: "#E65100",
    info: "#42A5F5",
    infoContainer: "#0D47A1",

    // Outline and borders
    outline: "#3E3E3E",
    outlineVariant: "#2C2C2C",

    // Text colors
    text: "#E6E1E5",
    textSecondary: "#C7C5CA",

    // Tab bar
    tint: "#4DB6AC",
    tabIconDefault: "#90A4AE",
    tabIconSelected: "#4DB6AC",
    icon: "#C7C5CA",

    // Card shadows and elevation
    shadow: "#000000",
    elevation1: "#242424",
    elevation2: "#2C2C2C",
    elevation3: "#353535",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
