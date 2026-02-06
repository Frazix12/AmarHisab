/**
 * Animation utilities and configurations
 * Using react-native-reanimated for 60fps UI thread animations
 */

import { useEffect } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// Animation timing configurations
export const ANIMATION_CONFIGS = {
  modal: {
    spring: {
      damping: 15,
      stiffness: 150,
      mass: 0.8,
      overshootClamping: false,
    },
    timing: {
      duration: 300,
    },
  },
  fade: {
    duration: 200,
  },
  quick: {
    duration: 150,
  },
};

// Hook for modal slide-up animation
export const useModalAnimation = (visible: boolean) => {
  const translateY = useSharedValue(1000);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, ANIMATION_CONFIGS.modal.spring);
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(1000, ANIMATION_CONFIGS.modal.timing);
      opacity.value = withTiming(0, { duration: 150 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return { animatedStyle, backdropStyle };
};

// Hook for fade animation
export const useFadeAnimation = (visible: boolean) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, ANIMATION_CONFIGS.fade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return animatedStyle;
};

// Hook for scale bounce animation
export const useScaleAnimation = (pressed: boolean) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(pressed ? 0.95 : 1, {
      damping: 10,
      stiffness: 200,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return animatedStyle;
};
