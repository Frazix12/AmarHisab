import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { AppProvider, useApp } from "@/contexts/app-context";

export const unstable_settings = {
  anchor: "(tabs)",
};

const RootLayoutContent = () => {
  const { colorScheme } = useApp();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
        <Stack.Screen name="templates" options={{ headerShown: false }} />
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
