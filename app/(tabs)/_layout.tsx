import { Tabs } from "expo-router";
import React from "react";

import { CustomTabBar } from "@/components/navigation/custom-tab-bar";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        animation: "fade",
        lazy: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Expenses",
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: "Grocery",
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: "Statistics",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
        }}
      />
    </Tabs>
  );
}
