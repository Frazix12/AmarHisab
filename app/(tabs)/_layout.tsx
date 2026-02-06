import { Tabs } from "expo-router";
import React from "react";

import { CustomTabBar } from "@/components/navigation/custom-tab-bar";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";

export default function TabLayout() {
  const { colorScheme, t } = useApp();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        animation: "shift",
        lazy: false,
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
