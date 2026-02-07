import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import React, { useEffect } from "react";

import { AppProvider, useApp } from "@/contexts/app-context";
import {
  ensureTextMetricsPatched,
  setTextMetricsLanguage,
} from "@/utils/text-metrics";

export const unstable_settings = {
  anchor: "(tabs)",
};

const RootLayoutContent = () => {
  const { colorScheme, settings } = useApp();

  useEffect(() => {
    ensureTextMetricsPatched();
  }, []);

  useEffect(() => {
    setTextMetricsLanguage(settings.language);
  }, [settings.language]);

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
    <AppProvider>
      <RootLayoutContent />
    </AppProvider>
  );
}
