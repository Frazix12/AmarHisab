import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import React, { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { PostHogProvider, usePostHog } from "posthog-react-native";

import { AppProvider, useApp } from "@/contexts/app-context";
import {
  ensureTextMetricsPatched,
  setTextMetricsLanguage,
} from "@/utils/text-metrics";
import { flushEvents, setPostHogClient } from "@/services/analytics";

export const unstable_settings = {
  anchor: "(tabs)",
};

const RootLayoutContent = () => {
  const { colorScheme, settings } = useApp();
  const posthog = usePostHog();

  useEffect(() => {
    ensureTextMetricsPatched();
  }, []);

  useEffect(() => {
    setTextMetricsLanguage(settings.language);
  }, [settings.language]);

  // Connect PostHog client to analytics service
  useEffect(() => {
    if (posthog) {
      setPostHogClient(posthog);
    }
    return () => {
      setPostHogClient(null);
    };
  }, [posthog]);

  // Flush analytics when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        flushEvents();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          animation: "fade",
          animationDuration: 220,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
            title: "Modal",
            animation: "slide_from_bottom",
            animationDuration: 240,
          }}
        />
        <Stack.Screen
          name="templates"
          options={{
            headerShown: false,
            animation: "slide_from_right",
            animationDuration: 240,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
            animation: "slide_from_right",
            animationDuration: 240,
          }}
        />
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
};

export default function RootLayout() {
  return (
    <PostHogProvider
      apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY!}
      options={{
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST!,
        // App lifecycle tracking
        captureAppLifecycleEvents: true,
        flushAt: 20,
        flushInterval: 30000,
        // Session replay
        enableSessionReplay: true,
        sessionReplayConfig: {
          maskAllTextInputs: true,
          maskAllImages: false,
        },
        // Error tracking - auto-capture all errors
        errorTracking: {
          autocapture: {
            uncaughtExceptions: true,
            unhandledRejections: true,
            console: ["error", "warn"],
          },
        },
      }}
      // Autocapture touches and screens
      autocapture={{
        captureTouches: true,
        captureScreens: true,
      }}
    >
      <AppProvider>
        <RootLayoutContent />
      </AppProvider>
    </PostHogProvider>
  );
}