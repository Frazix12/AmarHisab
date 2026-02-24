import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import {
  Wallet03Icon,
  LockIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useApp } from "@/contexts/app-context";
import { Colors, Fonts } from "@/constants/theme";
import { useOnboardingStepAnimation } from "@/features/onboarding/animations";

interface WelcomeStepProps {
  isActive: boolean;
}

export function WelcomeStep({ isActive }: WelcomeStepProps) {
  const { colorScheme, t } = useApp();
  const colors = Colors[colorScheme];
  const { containerStyle, titleStyle, bodyStyle, iconStyle } =
    useOnboardingStepAnimation(isActive);

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.iconWrapper, iconStyle]}>
        <HugeiconsIcon
          icon={Wallet03Icon}
          size={80}
          color={colors.primary}
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
        {t.onboarding.welcome}
      </Animated.Text>
      <Animated.Text
        style={[styles.subtitle, { color: colors.textSecondary }, bodyStyle]}
      >
        {t.onboarding.welcomeSubtitle}
      </Animated.Text>
      <Animated.View style={[styles.privacyRow, bodyStyle]}>
        <HugeiconsIcon
          icon={LockIcon}
          size={14}
          color={colors.textTertiary}
          strokeWidth={1.5}
        />
        <Text style={[styles.privacyText, { color: colors.textTertiary }]}>
          {t.onboarding.privacyNote}
        </Text>
      </Animated.View>
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
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  privacyText: {
    fontSize: 13,
    flex: 1,
  },
});
