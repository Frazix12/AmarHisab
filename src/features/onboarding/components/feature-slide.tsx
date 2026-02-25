import React from "react";
import { Text, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useApp } from "@/contexts/app-context";
import { Colors, Fonts } from "@/constants/theme";
import { useOnboardingStepAnimation } from "@/features/onboarding/animations";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = any;

interface FeatureSlideProps {
  icon: IconType;
  title: string;
  body: string;
  isActive: boolean;
  colorAccent?: string;
}

export function FeatureSlide({
  icon,
  title,
  body,
  isActive,
  colorAccent,
}: FeatureSlideProps) {
  const { colorScheme } = useApp();
  const colors = Colors[colorScheme];
  const { containerStyle, titleStyle, bodyStyle, iconStyle } =
    useOnboardingStepAnimation(isActive);

  const accentColor = colorAccent ?? colors.primary;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.iconWrapper, iconStyle]}>
        <HugeiconsIcon
          icon={icon}
          size={64}
          color={accentColor}
          strokeWidth={1.5}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.title,
          { color: colors.text, fontFamily: Fonts.sans },
          titleStyle,
        ]}
      >
        {title}
      </Animated.Text>
      <Animated.Text
        style={[styles.body, { color: colors.textSecondary }, bodyStyle]}
      >
        {body}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrapper: {
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 280,
  },
});
