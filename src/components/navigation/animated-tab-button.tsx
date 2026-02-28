import { Colors } from "@/constants/theme";
import { useTheme } from "@/contexts/app-selectors";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { useReducedMotionPreference } from "@/utils/animations";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface AnimatedTabButtonProps {
  isActive: boolean;
  icon: any; // HugeIcons IconSvgObject type
  label: string;
  color: string;
  onPress: () => void;
}

const ANIMATION_CONFIG = {
  activeDuration: 220,
  inactiveDuration: 170,
} as const;

export const AnimatedTabButton: React.FC<AnimatedTabButtonProps> = ({
  isActive,
  icon,
  label,
  color,
  onPress,
}) => {
  const colorScheme = useTheme();
  const colors = Colors[colorScheme];
  const reduceMotion = useReducedMotionPreference();

  const activeProgress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(isActive ? 1 : 0, {
      duration: reduceMotion
        ? 0
        : isActive
          ? ANIMATION_CONFIG.activeDuration
          : ANIMATION_CONFIG.inactiveDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeProgress, isActive, reduceMotion]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(activeProgress.value, [0, 1], [1, 1.12], Extrapolation.CLAMP),
      },
      {
        translateY: interpolate(activeProgress.value, [0, 1], [0, -1], Extrapolation.CLAMP),
      },
    ],
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(activeProgress.value, [0, 1], [0.82, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(activeProgress.value, [0, 1], [0, -1], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <Pressable
      haptic="none"
      onPress={onPress}
      style={styles.container}
      hitSlop={8}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <HugeiconsIcon
          icon={icon}
          size={28}
          color={color}
          strokeWidth={isActive ? 2.2 : 1.7}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.label,
          { color: isActive ? colors.tint : colors.textSecondary },
          animatedLabelStyle,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 8,
    minHeight: 68,
    borderRadius: 18,
    overflow: "visible",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    minHeight: 18,
    width: "100%",
    textAlign: "center",
    paddingHorizontal: 2,
    includeFontPadding: true,
  },
});
