import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useReducedMotionPreference } from "@/utils/animations";

export const ONBOARDING_ANIMATION = {
  stepEnter: {
    duration: 300,
    easing: Easing.out(Easing.cubic),
  },
  contentStagger: {
    baseDelay: 80, // ms between staggered elements
    duration: 280,
  },
  iconSpring: {
    damping: 18,
    stiffness: 200,
    mass: 0.8,
  },
  celebration: {
    scaleDuration: 400,
    bounceDamping: 12,
    bounceStiffness: 180,
  },
} as const;

/**
 * Animation hook for onboarding step transitions.
 * Returns animated styles for container, title, body, and icon.
 * When isActive=false: all values snap to 0 (hidden).
 * When reducedMotion: all values snap to final state instantly.
 */
export function useOnboardingStepAnimation(isActive: boolean) {
  const reducedMotion = useReducedMotionPreference();

  const containerOpacity = useSharedValue(0);
  const containerTranslateY = useSharedValue(20);
  const titleOpacity = useSharedValue(0);
  const bodyOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.8);

  useEffect(() => {
    if (!isActive) {
      // Snap hidden when inactive
      containerOpacity.value = 0;
      containerTranslateY.value = 20;
      titleOpacity.value = 0;
      bodyOpacity.value = 0;
      iconScale.value = 0.8;
      return;
    }

    const duration = reducedMotion
      ? 0
      : ONBOARDING_ANIMATION.stepEnter.duration;
    const easing = reducedMotion
      ? Easing.linear
      : ONBOARDING_ANIMATION.stepEnter.easing;
    const staggerDelay = reducedMotion
      ? 0
      : ONBOARDING_ANIMATION.contentStagger.baseDelay;

    containerOpacity.value = withTiming(1, { duration, easing });
    containerTranslateY.value = withTiming(0, { duration, easing });

    titleOpacity.value = withDelay(
      staggerDelay,
      withTiming(1, {
        duration: reducedMotion
          ? 0
          : ONBOARDING_ANIMATION.contentStagger.duration,
        easing,
      })
    );

    bodyOpacity.value = withDelay(
      staggerDelay * 2,
      withTiming(1, {
        duration: reducedMotion
          ? 0
          : ONBOARDING_ANIMATION.contentStagger.duration,
        easing,
      })
    );

    iconScale.value = reducedMotion
      ? 1
      : withSpring(1, {
          damping: ONBOARDING_ANIMATION.iconSpring.damping,
          stiffness: ONBOARDING_ANIMATION.iconSpring.stiffness,
          mass: ONBOARDING_ANIMATION.iconSpring.mass,
        });
  }, [isActive, reducedMotion]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ translateY: containerTranslateY.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return { containerStyle, titleStyle, bodyStyle, iconStyle };
}

export function useCelebrationAnimation(isActive: boolean) {
  const reducedMotion = useReducedMotionPreference();

  const checkScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(16);

  useEffect(() => {
    if (!isActive) {
      checkScale.value = 0;
      textOpacity.value = 0;
      textTranslateY.value = 16;
      return;
    }

    if (reducedMotion) {
      checkScale.value = 1;
      textOpacity.value = 1;
      textTranslateY.value = 0;
      return;
    }

    checkScale.value = withSpring(1, {
      damping: ONBOARDING_ANIMATION.celebration.bounceDamping,
      stiffness: ONBOARDING_ANIMATION.celebration.bounceStiffness,
    });

    textOpacity.value = withDelay(
      ONBOARDING_ANIMATION.celebration.scaleDuration / 2,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );

    textTranslateY.value = withDelay(
      ONBOARDING_ANIMATION.celebration.scaleDuration / 2,
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, [checkScale, isActive, reducedMotion, textOpacity, textTranslateY]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return { checkStyle, textStyle };
}
