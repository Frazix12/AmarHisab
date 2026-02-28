import { Stack } from "expo-router";

export default function ExpensesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 240,
        gestureEnabled: true,
      }}
    />
  );
}
