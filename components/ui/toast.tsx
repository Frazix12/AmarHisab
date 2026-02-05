import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useEffect, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";

let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
  }, 2000);
};

const animateIn = (slideAnim: Animated.Value, opacityAnim: Animated.Value) => {
  Animated.parallel([
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }),
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }),
  ]).start();
};

const animateOut = (slideAnim: Animated.Value, opacityAnim: Animated.Value) => {
  Animated.parallel([
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }),
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }),
  ]).start();
};

export const Toast: React.FC = () => {
  const { colorScheme } = useApp();
  const colors = Colors[colorScheme];
  const [state, setState] = useState<ToastState>(toastState);
  const slideAnim = useState(new Animated.Value(100))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const listener = (newState: ToastState) => {
      setState(newState);
      if (newState.visible) {
        animateIn(slideAnim, opacityAnim);
      } else {
        animateOut(slideAnim, opacityAnim);
      }
    };

    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [slideAnim, opacityAnim]);

  if (!state.visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
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
  },
});
