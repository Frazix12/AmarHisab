import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text } from "react-native";

const STORAGE_KEY_PREFIX = "@onboarding_longpress_tip_dismissed_";

interface OnboardingTipProps {
  screenKey: "expenses" | "grocery";
}

export const OnboardingTip: React.FC<OnboardingTipProps> = ({ screenKey }) => {
  const { colorScheme, t } = useApp();
  const colors = Colors[colorScheme];
  const [visible, setVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(-100))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  const animateOut = useCallback(
    (callback: () => void) => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(callback);
    },
    [slideAnim, opacityAnim],
  );

  const handleDismiss = useCallback(async () => {
    animateOut(async () => {
      setVisible(false);
      try {
        await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${screenKey}`, "true");
      } catch (error) {
        console.error("Error saving onboarding tip dismissal:", error);
      }
    });
  }, [screenKey, animateOut]);

  const checkDismissal = useCallback(async () => {
    try {
      const dismissed = await AsyncStorage.getItem(
        `${STORAGE_KEY_PREFIX}${screenKey}`,
      );
      if (!dismissed) {
        setVisible(true);
        animateIn();
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
          handleDismiss();
        }, 10000);
      }
    } catch (error) {
      console.error("Error checking onboarding tip dismissal:", error);
    }
  }, [screenKey, animateIn, handleDismiss]);

  useEffect(() => {
    checkDismissal();
  }, [checkDismissal]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.primaryContainer,
          borderColor: colors.primary,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Text style={[styles.tipText, { color: colors.text }]}>
        {t.tips?.longPressTip ||
          "💡 Tip: Long-press any item to edit or delete"}
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
    padding: 4,
  },
});
