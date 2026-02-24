import { Tabs } from "expo-router";
import React from "react";

import { CustomTabBar } from "@/components/navigation/custom-tab-bar";
import { Colors } from "@/constants/theme";
import { useI18n, useTheme } from "@/contexts/app-selectors";

export default function TabLayout() {
  const colorScheme = useTheme();
  const { t } = useI18n();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        animation: "shift",
        lazy: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.expenses,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: t.tabs.grocery,
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: t.tabs.statistics,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.tabs.settings,
        }}
      />
    </Tabs>
  );
}
