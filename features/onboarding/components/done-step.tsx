import React from "react";
import { Text, Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useApp } from "@/contexts/app-context";
import { Colors, Fonts } from "@/constants/theme";
import { useCelebrationAnimation } from "@/features/onboarding/animations";

interface DoneStepProps {
  isActive: boolean;
  onComplete: () => void;
}

export function DoneStep({ isActive, onComplete }: DoneStepProps) {
  const { colorScheme, t } = useApp();
  const colors = Colors[colorScheme];
  const { checkStyle, textStyle } = useCelebrationAnimation();

  if (!isActive) return null;

  return (
    <Animated.View style={styles.container}>
      <Animated.View style={[styles.iconWrapper, checkStyle]}>
        <HugeiconsIcon
          icon={CheckmarkCircle01Icon}
          size={80}
          color={colors.primary}
          strokeWidth={1.5}
        />
      </Animated.View>
      <Animated.View style={textStyle}>
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: Fonts.sans },
          ]}
        >
          {t.onboarding.allSet}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t.onboarding.allSetSubtitle}
        </Text>
      </Animated.View>
      <Pressable
        onPress={onComplete}
        style={[styles.button, { backgroundColor: colors.primary }]}
        accessibilityLabel={t.onboarding.letsGo}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
          {t.onboarding.letsGo}
        </Text>
      </Pressable>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  button: {
    marginTop: 24,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
