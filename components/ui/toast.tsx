import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import {
  getCurrentNotification,
  NotificationPayload,
  showToast,
  subscribeToNotifications,
} from "@/services/notifications";
import { useReducedMotionPreference } from "@/utils/animations";
import {
  Cancel01Icon,
  InformationCircleIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { BlurView } from "expo-blur";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

type VisualConfig = {
  accent: string;
  iconBackground: string;
  iconColor: string;
  icon: typeof Tick02Icon;
};

const getVisualConfig = (
  notification: NotificationPayload,
  colors: (typeof Colors)["light"],
): VisualConfig => {
  switch (notification.type) {
    case "success":
      return {
        accent: colors.success,
        iconBackground: colors.successContainer,
        iconColor: colors.success,
        icon: Tick02Icon,
      };
    case "error":
      return {
        accent: colors.error,
        iconBackground: colors.errorContainer,
        iconColor: colors.error,
        icon: Cancel01Icon,
      };
    case "warning":
      return {
        accent: colors.warning,
        iconBackground: colors.warningContainer,
        iconColor: colors.warning,
        icon: InformationCircleIcon,
      };
    case "hint":
      return {
        accent: colors.primary,
        iconBackground: colors.primaryContainer,
        iconColor: colors.primary,
        icon: InformationCircleIcon,
      };
    case "info":
    default:
      return {
        accent: colors.info,
        iconBackground: colors.infoContainer,
        iconColor: colors.info,
        icon: InformationCircleIcon,
      };
  }
};

export const Toast: React.FC = () => {
  const { colorScheme } = useApp();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotionPreference();
  const [notification, setNotification] = useState<NotificationPayload | null>(
    getCurrentNotification(),
  );
  const [renderNotification, setRenderNotification] =
    useState<NotificationPayload | null>(notification);
  const [shouldRender, setShouldRender] = useState(Boolean(notification));
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useSharedValue(notification ? 1 : 0);

  useEffect(() => {
    return subscribeToNotifications((nextNotification) => {
      setNotification(nextNotification);
    });
  }, []);

  useEffect(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (notification) {
      setRenderNotification(notification);
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
      setRenderNotification(null);
    }, 170);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [notification, progress, reduceMotion]);

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

  if (!shouldRender || !renderNotification) return null;

  const visualConfig = getVisualConfig(renderNotification, colors);
  const blurTint = colorScheme === "dark" ? "dark" : "light";
  const blurIntensity = colorScheme === "dark" ? 42 : 70;
  const surfaceOverlayColor =
    colorScheme === "dark"
      ? "rgba(31, 24, 32, 0.62)"
      : "rgba(246, 239, 244, 0.72)";

  return (
    <Animated.View
      style={[styles.container, { top: insets.top + 10 }, animatedStyle]}
      pointerEvents="none"
    >
      <View style={[styles.toastShell, { borderColor: visualConfig.accent }]}> 
        <BlurView
          intensity={blurIntensity}
          tint={blurTint}
          style={styles.blurLayer}
          experimentalBlurMethod={
            Platform.OS === "android" ? "dimezisBlurView" : undefined
          }
        >
          <View style={[styles.toast, { backgroundColor: surfaceOverlayColor }]}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: visualConfig.iconBackground },
              ]}
            >
              <HugeiconsIcon
                icon={visualConfig.icon}
                size={20}
                color={visualConfig.iconColor}
                strokeWidth={2.5}
              />
            </View>
            <View style={styles.textGroup}>
              {renderNotification.title ? (
                <Text style={[styles.title, { color: colors.text }]}>
                  {renderNotification.title}
                </Text>
              ) : null}
              <Text style={[styles.message, { color: colors.text }]}> 
                {renderNotification.message}
              </Text>
            </View>
          </View>
        </BlurView>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toastShell: {
    width: "94%",
    maxWidth: 560,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  blurLayer: {
    width: "100%",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 78,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  textGroup: {
    flex: 1,
    paddingRight: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
    lineHeight: 18,
  },
  message: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
});

export { showToast };
