import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Application from "expo-application";
import { Stack, Redirect, useGlobalSearchParams, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import "react-native-reanimated";
import React, { useEffect, useMemo, useState } from "react";
import { AppState, AppStateStatus, InteractionManager, Platform } from "react-native";
import { PostHogProvider, usePostHog } from "posthog-react-native";

import { Toast } from "@/components/ui/toast";
import { AppProvider } from "@/contexts/app-context";
import { useI18n, useSettingsDomain, useTheme } from "@/contexts/app-selectors";
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
  loadOnboardingCompleted,
} from "@/services/storage";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Keep native splash screen visible until onboarding flag is loaded
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden or not supported — ignore
});

const RootLayoutContent = () => {
  const colorScheme = useTheme();
  const { settings } = useSettingsDomain();
  const { t } = useI18n();
  const posthog = usePostHog();
  const pathname = usePathname();
  const searchParams = useGlobalSearchParams();

  const screenParams = useMemo(() => {
    const keys = Object.keys(searchParams ?? {}).sort();
    return {
      params_keys: keys,
      params_count: keys.length,
    };
  }, [searchParams]);

  useEffect(() => {
    resetTextMetrics();
    ensureTextMetricsPatched();
    setTextMetricsLanguage(settings.language);

    return () => {
      resetTextMetrics();
    };
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
    const task = InteractionManager.runAfterInteractions(() => {
      if (posthog) {
        setPostHogClient(posthog);
      }
    });

    return () => {
      task.cancel();
      setPostHogClient(null);
    };
  }, [posthog]);

  // Manual screen tracking for Expo Router (pathname-based)
  useEffect(() => {
    if (!posthog || typeof posthog.screen !== "function") {
      return;
    }

    if (!pathname) {
      return;
    }

    try {
      posthog.screen(pathname, screenParams);
    } catch (error) {
      console.warn("[PostHog] screen tracking failed", error);
    }
  }, [pathname, posthog, screenParams]);

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

    const task = InteractionManager.runAfterInteractions(() => {
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
    });

    return () => {
      isActive = false;
      task.cancel();
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
          name="onboarding"
          options={{
            headerShown: false,
            animation: "none",
            gestureEnabled: false,
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
        <Stack.Screen
          name="expenses"
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
  const [isReady, setIsReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Load onboarding flag OUTSIDE AppProvider — independent check before any context loads
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const completed = await loadOnboardingCompleted();
        if (isMounted) {
          setNeedsOnboarding(!completed);
        }
      } catch {
        // If we can't read the flag, default to showing onboarding
        if (isMounted) setNeedsOnboarding(true);
      } finally {
        if (isMounted) {
          setIsReady(true);
          await SplashScreen.hideAsync().catch(() => {});
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Keep splash visible until onboarding check is done
  if (!isReady) return null;

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
          {needsOnboarding && <Redirect href="/onboarding" />}
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
            maskAllImages: true,
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
          captureScreens: false,
        }}
      >
        <AppProvider>
          {needsOnboarding && <Redirect href="/onboarding" />}
          <RootLayoutContent />
        </AppProvider>
      </PostHogProvider>
    </ErrorBoundary>
  );
}
