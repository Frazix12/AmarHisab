import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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
  iconScale: {
    inactive: 1.0,
    active: 1.4,
  },
  iconTranslateY: {
    inactive: 0,
    active: 3.6, // Half of label height (16px / 2) to center vertically
  },
  labelOpacity: {
    inactive: 1.0,
    active: 0.0,
  },
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  timing: {
    duration: 150,
  },
};

export const AnimatedTabButton: React.FC<AnimatedTabButtonProps> = ({
  isActive,
  icon,
  label,
  color,
  onPress,
}) => {
  const { colorScheme } = useApp();
  const colors = Colors[colorScheme];

  // Shared values for animations
  const iconScale = useSharedValue(ANIMATION_CONFIG.iconScale.inactive);
  const iconTranslateY = useSharedValue(
    ANIMATION_CONFIG.iconTranslateY.inactive,
  );
  const labelOpacity = useSharedValue(ANIMATION_CONFIG.labelOpacity.inactive);

  // Animate when active state changes
  useEffect(() => {
    iconScale.value = withSpring(
      isActive
        ? ANIMATION_CONFIG.iconScale.active
        : ANIMATION_CONFIG.iconScale.inactive,
      ANIMATION_CONFIG.spring,
    );
    iconTranslateY.value = withSpring(
      isActive
        ? ANIMATION_CONFIG.iconTranslateY.active
        : ANIMATION_CONFIG.iconTranslateY.inactive,
      ANIMATION_CONFIG.spring,
    );
    labelOpacity.value = withTiming(
      isActive
        ? ANIMATION_CONFIG.labelOpacity.active
        : ANIMATION_CONFIG.labelOpacity.inactive,
      { duration: ANIMATION_CONFIG.timing.duration },
    );
  }, [isActive, iconScale, iconTranslateY, labelOpacity]);

  // Animated styles
  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { translateY: iconTranslateY.value },
    ],
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  const handlePress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={styles.container}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <HugeiconsIcon
          icon={icon}
          size={28}
          color={color}
          strokeWidth={isActive ? 2 : 1.5}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.label,
          { color: isActive ? colors.textSecondary : colors.textSecondary },
          animatedLabelStyle,
        ]}
        numberOfLines={1}
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
    paddingVertical: 8,
    minHeight: 60,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    minHeight: 18,
  },
});
