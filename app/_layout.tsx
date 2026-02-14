import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Application from "expo-application";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import * as Updates from "expo-updates";
import "react-native-reanimated";
import React, { useEffect } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { PostHogProvider, usePostHog } from "posthog-react-native";

import { Toast } from "@/components/ui/toast";
import { AppProvider, useApp } from "@/contexts/app-context";
import { subscribeToApiRateLimited } from "@/services/ai/rate-limiter";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import {
  ensureTextMetricsPatched,
  resetTextMetrics,
  setTextMetricsLanguage,
} from "@/utils/text-metrics";
import { flushEvents, setPostHogClient } from "@/services/analytics";
import { showNotification } from "@/services/notifications";
import {
  loadAppUpdateFingerprint,
  saveAppUpdateFingerprint,
} from "@/services/storage";

export const unstable_settings = {
  anchor: "(tabs)",
};

const RootLayoutContent = () => {
  const { colorScheme, settings, t } = useApp();
  const posthog = usePostHog();

  useEffect(() => {
    resetTextMetrics();
    ensureTextMetricsPatched();

    return () => {
      resetTextMetrics();
    };
  }, []);

  useEffect(() => {
    setTextMetricsLanguage(settings.language);
  }, [settings.language]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const configureNavigationBar = async () => {
      try {
        await NavigationBar.setPositionAsync("relative");
      } catch (error) {
        console.warn("Failed to configure Android navigation bar", error);
      }
    };

    void configureNavigationBar();
  }, []);

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

  useEffect(() => {
    return subscribeToApiRateLimited(() => {
      showNotification(t.alerts.tooManyRequests, {
        type: "warning",
        title: t.alerts.errorTitle,
        dedupeKey: "api-rate-limited",
      });
    });
  }, [t.alerts.errorTitle, t.alerts.tooManyRequests]);

  useEffect(() => {
    let isActive = true;

    const checkForUpdatedAppVersion = async () => {
      const currentFingerprint = [
        Application.nativeApplicationVersion || "unknown",
        Application.nativeBuildVersion || "unknown",
        Updates.updateId || "embedded",
      ].join(":");

      const previousFingerprint = await loadAppUpdateFingerprint();
      if (!isActive) {
        return;
      }

      if (previousFingerprint && previousFingerprint !== currentFingerprint) {
        showNotification(t.alerts.appUpdated, {
          type: "success",
          dedupeKey: "app-updated",
        });
      }

      await saveAppUpdateFingerprint(currentFingerprint);
    };

    void checkForUpdatedAppVersion();

    return () => {
      isActive = false;
    };
  }, [t.alerts.appUpdated]);

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
      <Toast />
    </ThemeProvider>
  );
};

export default function RootLayout() {
  // Validate PostHog environment variables before rendering provider
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

  // If env vars are missing, render app without PostHog (analytics disabled)
  if (!apiKey || !host) {
    if (__DEV__) {
      console.warn(
        "[PostHog] Missing EXPO_PUBLIC_POSTHOG_API_KEY or EXPO_PUBLIC_POSTHOG_HOST - analytics disabled"
      );
    }
    return (
      <ErrorBoundary>
        <AppProvider>
          <RootLayoutContent />
        </AppProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <PostHogProvider
        apiKey={apiKey}
        options={{
          host: host,
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
    </ErrorBoundary>
  );
}
