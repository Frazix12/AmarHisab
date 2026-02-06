import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { useReducedMotionPreference } from "@/utils/animations";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const STORAGE_KEY_PREFIX = "@onboarding_longpress_tip_dismissed_";

interface OnboardingTipProps {
  screenKey: "expenses" | "grocery";
}

export const OnboardingTip: React.FC<OnboardingTipProps> = ({ screenKey }) => {
  const { colorScheme, t } = useApp();
  const colors = Colors[colorScheme];
  const reduceMotion = useReducedMotionPreference();
  const [shouldRender, setShouldRender] = useState(false);
  const progress = useSharedValue(0);
  const autoDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animateIn = useCallback(() => {
    setShouldRender(true);
    progress.value = reduceMotion
      ? withTiming(1, { duration: 0 })
      : withSpring(1, {
          damping: 16,
          stiffness: 220,
          mass: 0.9,
        });
  }, [progress, reduceMotion]);

  const animateOut = useCallback(
    (callback?: () => void) => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      progress.value = withTiming(0, {
        duration: reduceMotion ? 0 : 180,
        easing: Easing.in(Easing.cubic),
      });

      if (reduceMotion) {
        setShouldRender(false);
        callback?.();
        return;
      }

      hideTimeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        callback?.();
      }, 180);
    },
    [progress, reduceMotion],
  );

  const handleDismiss = useCallback(async () => {
    if (autoDismissTimeoutRef.current) {
      clearTimeout(autoDismissTimeoutRef.current);
      autoDismissTimeoutRef.current = null;
    }

    animateOut(() => {
      void AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${screenKey}`, "true").catch(
        (error) => {
          console.error("Error saving onboarding tip dismissal:", error);
        },
      );
    });
  }, [animateOut, screenKey]);

  const checkDismissal = useCallback(async () => {
    try {
      const dismissed = await AsyncStorage.getItem(
        `${STORAGE_KEY_PREFIX}${screenKey}`,
      );
      if (!dismissed) {
        animateIn();

        autoDismissTimeoutRef.current = setTimeout(() => {
          void handleDismiss();
        }, 10000);
      }
    } catch (error) {
      console.error("Error checking onboarding tip dismissal:", error);
    }
  }, [screenKey, animateIn, handleDismiss]);

  useEffect(() => {
    void checkDismissal();

    return () => {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [checkDismissal]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [-10, 0], Extrapolation.CLAMP),
      },
      {
        scale: interpolate(progress.value, [0, 1], [0.98, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  if (!shouldRender) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.primaryContainer,
          borderColor: colors.primary,
        },
        animatedStyle,
      ]}
    >
      <Text style={[styles.tipText, { color: colors.text }]}>
        {t.tips?.longPressTip || "Long-press an item to edit or delete it quickly."}
      </Text>
      <Pressable
        onPress={handleDismiss}
        style={({ pressed }) => [
          styles.closeButton,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        accessibilityLabel="Dismiss tip"
        accessibilityRole="button"
      >
        <HugeiconsIcon
          icon={Cancel01Icon}
          size={18}
          color={colors.text}
          strokeWidth={2}
        />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    marginRight: 12,
    lineHeight: 18,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
