import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export const ANIMATION_CONFIGS = {
  modal: {
    enterDuration: 260,
    exitDuration: 190,
    backdropDuration: 180,
    spring: {
      damping: 18,
      stiffness: 220,
      mass: 0.9,
    },
  },
  page: {
    enterDuration: 240,
    exitDuration: 160,
  },
  fade: {
    duration: 200,
  },
  quick: {
    duration: 150,
  },
} as const;

export const useReducedMotionPreference = () => {
  const [reducedMotionEnabled, setReducedMotionEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const syncReducedMotion = async () => {
      try {
        const enabled = await AccessibilityInfo.isReduceMotionEnabled();
        if (isMounted) {
          setReducedMotionEnabled(enabled);
        }
      } catch {
        if (isMounted) {
          setReducedMotionEnabled(false);
        }
      }
    };

    void syncReducedMotion();

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotionEnabled,
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return reducedMotionEnabled;
};

export const useModalAnimation = (visible: boolean) => {
  const reduceMotion = useReducedMotionPreference();
  const [shouldRender, setShouldRender] = useState(visible);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (visible) {
      setShouldRender(true);
      progress.value = reduceMotion
        ? withTiming(1, { duration: 0 })
        : withSpring(1, ANIMATION_CONFIGS.modal.spring);
      return;
    }

    progress.value = withTiming(0, {
      duration: reduceMotion ? 0 : ANIMATION_CONFIGS.modal.exitDuration,
      easing: Easing.in(Easing.cubic),
    });

    if (reduceMotion) {
      setShouldRender(false);
      return;
    }

    hideTimeoutRef.current = setTimeout(() => {
      setShouldRender(false);
    }, ANIMATION_CONFIGS.modal.exitDuration);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [progress, reduceMotion, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.96, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [28, 0], Extrapolation.CLAMP),
      },
      {
        scale: interpolate(progress.value, [0, 1], [0.98, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return { animatedStyle, backdropStyle, shouldRender };
};

export const useFadeAnimation = (visible: boolean) => {
  const reduceMotion = useReducedMotionPreference();
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: reduceMotion ? 0 : ANIMATION_CONFIGS.fade.duration,
      easing: Easing.out(Easing.quad),
    });
  }, [opacity, reduceMotion, visible]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
};

export const useScaleAnimation = (pressed: boolean) => {
  const reduceMotion = useReducedMotionPreference();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = reduceMotion
      ? withTiming(pressed ? 0.98 : 1, { duration: 0 })
      : withSpring(pressed ? 0.96 : 1, {
          damping: 14,
          stiffness: 260,
          mass: 0.6,
        });
  }, [pressed, reduceMotion, scale]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
};

export const usePageTransition = () => {
  const reduceMotion = useReducedMotionPreference();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: reduceMotion ? 0 : ANIMATION_CONFIGS.page.enterDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, reduceMotion]);

  return useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.94, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [10, 0], Extrapolation.CLAMP),
      },
      {
        scale: interpolate(progress.value, [0, 1], [0.985, 1], Extrapolation.CLAMP),
      },
    ],
  }));
};
