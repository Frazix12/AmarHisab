import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export type HapticFeedbackType = "none" | "light" | "medium" | "heavy";

const triggerImpact = (style: Haptics.ImpactFeedbackStyle) => {
  if (Platform.OS === "web") return;

  void Haptics.impactAsync(style).catch((error) => {
    console.warn("Haptic feedback failed:", error);
  });
};

export const triggerLightHaptic = () => {
  triggerImpact(Haptics.ImpactFeedbackStyle.Light);
};

export const triggerMediumHaptic = () => {
  triggerImpact(Haptics.ImpactFeedbackStyle.Medium);
};

export const triggerHeavyHaptic = () => {
  triggerImpact(Haptics.ImpactFeedbackStyle.Heavy);
};

export const triggerHaptic = (type: HapticFeedbackType = "heavy") => {
  switch (type) {
    case "light":
      triggerLightHaptic();
      break;
    case "medium":
      triggerMediumHaptic();
      break;
    case "heavy":
      triggerHeavyHaptic();
      break;
    default:
      break;
  }
};
