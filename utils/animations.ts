import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export const ANIMATION_CONFIGS = {
  modal: {
    enterDuration: 260,
    exitDuration: 190,
    backdropDuration: 180,
    spring: {
      damping: 20,
      stiffness: 260,
      mass: 0.8,
      overshootClamping: true,
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
  modalMorph: {
    enterDuration: 360,
    exitDuration: 240,
  },
} as const;

export interface MorphingModalOptions {
  screenWidth: number;
  screenHeight: number;
  fabSize: number;
  fabRight: number;
  fabBottom: number;
  modalHeightRatio?: number;
  expandedBorderRadius?: number;
  expandedBottomRadius?: number;
  expandedBottomOffset?: number;
  contentFadeDuration?: number;
  contentStartProgress?: number;
}

export interface MorphingFabOptions {
  travelY: number;
  travelX?: number;
  activeScale?: number;
}

const MORPH_SPRING = {
  damping: 22,
  stiffness: 280,
  mass: 0.72,
  overshootClamping: true,
} as const;

const FAB_SPRING = {
  damping: 14,
  stiffness: 190,
  mass: 0.76,
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

export const useMorphingModalAnimation = (
  visible: boolean,
  {
    screenWidth,
    screenHeight,
    fabSize,
    fabRight,
    fabBottom,
    modalHeightRatio = 0.9,
    expandedBorderRadius = 24,
    expandedBottomRadius = 0,
    expandedBottomOffset = -4,
    contentFadeDuration = 190,
    contentStartProgress = 0.84,
  }: MorphingModalOptions,
) => {
  const reduceMotion = useReducedMotionPreference();
  const [shouldRender, setShouldRender] = useState(visible);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useSharedValue(visible ? 1 : 0);
  const contentProgress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (visible) {
      setShouldRender(true);
      contentProgress.value = withTiming(0, { duration: 0 });
      progress.value = reduceMotion
        ? withTiming(1, { duration: 0 })
        : withSpring(1, MORPH_SPRING);
      contentProgress.value = withDelay(
        reduceMotion
          ? 0
          : ANIMATION_CONFIGS.modalMorph.enterDuration * contentStartProgress,
        reduceMotion
          ? withTiming(1, { duration: 0 })
          : withTiming(1, {
              duration: contentFadeDuration,
              easing: Easing.out(Easing.cubic),
            }),
      );
      return;
    }

    contentProgress.value = withTiming(0, {
      duration: reduceMotion ? 0 : 110,
      easing: Easing.in(Easing.quad),
    });
    progress.value = withTiming(0, {
      duration: reduceMotion ? 0 : ANIMATION_CONFIGS.modalMorph.exitDuration,
      easing: Easing.in(Easing.cubic),
    });

    if (reduceMotion) {
      setShouldRender(false);
      return;
    }

    hideTimeoutRef.current = setTimeout(() => {
      setShouldRender(false);
    }, ANIMATION_CONFIGS.modalMorph.exitDuration);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [contentFadeDuration, contentProgress, contentStartProgress, progress, reduceMotion, visible]);

  const shellStyle = useAnimatedStyle(() => {
    const expandedHeight = Math.max(screenHeight * modalHeightRatio, fabSize);
    const startScaleX = fabSize / screenWidth;
    const startScaleY = fabSize / expandedHeight;
    const startCenterX = screenWidth - fabRight - fabSize / 2;
    const startCenterY = screenHeight - fabBottom - fabSize / 2;
    const finalCenterX = screenWidth / 2;
    const finalCenterY = screenHeight - expandedBottomOffset - expandedHeight / 2;
    const startTranslateX = startCenterX - finalCenterX;
    const startTranslateY = startCenterY - finalCenterY;

    return {
      width: screenWidth,
      height: expandedHeight,
      right: 0,
      bottom: expandedBottomOffset,
      borderTopLeftRadius: interpolate(
        progress.value,
        [0, 1],
        [fabSize / 2, expandedBorderRadius],
        Extrapolation.CLAMP,
      ),
      borderTopRightRadius: interpolate(
        progress.value,
        [0, 1],
        [fabSize / 2, expandedBorderRadius],
        Extrapolation.CLAMP,
      ),
      borderBottomLeftRadius: interpolate(
        progress.value,
        [0, 1],
        [fabSize / 2, expandedBottomRadius],
        Extrapolation.CLAMP,
      ),
      borderBottomRightRadius: interpolate(
        progress.value,
        [0, 1],
        [fabSize / 2, expandedBottomRadius],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [0, 1],
            [startTranslateX, 0],
            Extrapolation.CLAMP,
          ),
        },
        {
          translateY: interpolate(
            progress.value,
            [0, 1],
            [startTranslateY, 0],
            Extrapolation.CLAMP,
          ),
        },
        {
          scaleX: interpolate(
            progress.value,
            [0, 1],
            [startScaleX, 1],
            Extrapolation.CLAMP,
          ),
        },
        {
          scaleY: interpolate(
            progress.value,
            [0, 1],
            [startScaleY, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(contentProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(contentProgress.value, [0, 1], [14, 0]),
      },
      {
        scale: interpolate(contentProgress.value, [0, 1], [0.97, 1]),
      },
    ],
  }));

  return {
    shouldRender,
    progress,
    shellStyle,
    backdropStyle,
    contentStyle,
  };
};

export const useMorphingFabAnimation = (
  active: boolean,
  { travelY, travelX = 0, activeScale = 0.84 }: MorphingFabOptions,
) => {
  const reduceMotion = useReducedMotionPreference();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(active ? 1 : 0, { duration: 0 })
      : active
        ? withSpring(1, FAB_SPRING)
        : withTiming(0, {
            duration: ANIMATION_CONFIGS.modalMorph.exitDuration,
            easing: Easing.inOut(Easing.cubic),
          });
  }, [active, progress, reduceMotion]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [0, travelX],
          Extrapolation.CLAMP,
        ),
      },
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [0, travelY],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(
          progress.value,
          [0, 1],
          [1, activeScale],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(
          progress.value,
          [0, 1],
          [0, 45],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));

  return { progress, fabStyle, iconStyle };
};
