import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { useReducedMotionPreference } from "@/utils/animations";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;
const TOAST_HIDE_DELAY_MS = 2200;

interface ToastState {
  visible: boolean;
  message: string;
}

const toastState: ToastState = {
  visible: false,
  message: "",
};

const listeners: ((state: ToastState) => void)[] = [];

export const showToast = (message: string) => {
  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
  }

  toastState.visible = true;
  toastState.message = message;
  listeners.forEach((listener) => listener({ ...toastState }));

  toastTimeoutId = setTimeout(() => {
    toastState.visible = false;
    listeners.forEach((listener) => listener({ ...toastState }));
  }, TOAST_HIDE_DELAY_MS);
};

export const Toast: React.FC = () => {
  const { colorScheme } = useApp();
  const colors = Colors[colorScheme];
  const reduceMotion = useReducedMotionPreference();
  const [state, setState] = useState<ToastState>(toastState);
  const [shouldRender, setShouldRender] = useState(toastState.visible);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useSharedValue(toastState.visible ? 1 : 0);

  useEffect(() => {
    const listener = (newState: ToastState) => {
      setState(newState);
    };

    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  useEffect(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (state.visible) {
      setShouldRender(true);
      progress.value = reduceMotion
        ? withTiming(1, { duration: 0 })
        : withSpring(1, {
            damping: 18,
            stiffness: 240,
            mass: 0.8,
          });
      return;
    }

    progress.value = withTiming(0, {
      duration: reduceMotion ? 0 : 170,
      easing: Easing.in(Easing.cubic),
    });

    if (reduceMotion) {
      setShouldRender(false);
      return;
    }

    hideTimeoutRef.current = setTimeout(() => {
      setShouldRender(false);
    }, 170);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [progress, reduceMotion, state.visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [16, 0], Extrapolation.CLAMP),
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
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outline,
          },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primary + "20" },
          ]}
        >
          <HugeiconsIcon
            icon={Tick02Icon}
            size={18}
            color={colors.primary}
            strokeWidth={2.5}
          />
        </View>
        <Text style={[styles.message, { color: colors.text }]}>
          {state.message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 80, // Above FAB
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 20,
    maxWidth: "90%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  message: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
  },
});
