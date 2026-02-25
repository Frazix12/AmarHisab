import React from "react";
import { View, StyleSheet } from "react-native";
import { useApp } from "@/contexts/app-context";
import { Colors } from "@/constants/theme";

interface DotIndicatorsProps {
  currentStep: number;
  totalSteps: number;
}

export function DotIndicators({ currentStep, totalSteps }: DotIndicatorsProps) {
  const { colorScheme } = useApp();
  const colors = Colors[colorScheme];
  const dotCount = Math.max(totalSteps, 0);
  const activeDot = Math.min(Math.max(currentStep, 0), Math.max(dotCount - 1, 0));

  return (
    <View style={styles.container}>
      {Array.from({ length: dotCount }, (_, dotIndex) => {
        const isActive = dotIndex === activeDot;
        return (
          <View
            key={dotIndex}
            style={[
              styles.dot,
              {
                backgroundColor: isActive ? colors.primary : colors.outline,
                width: isActive ? 24 : 8,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
