import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useApp } from "@/contexts/app-context";
import { Colors } from "@/constants/theme";

interface DotIndicatorsProps {
  currentStep: number;
  totalSteps: number;
}

// 5 dots: Welcome(0), Language(1), Currency(2), FeatureTour(3-5), Done(6)
function stepToDot(step: number): number {
  if (step <= 2) return step;
  if (step >= 3 && step <= 5) return 3;
  return 4;
}

export function DotIndicators({ currentStep }: DotIndicatorsProps) {
  const { colorScheme } = useApp();
  const colors = Colors[colorScheme];
  const activeDot = stepToDot(currentStep);

  return (
    <View style={styles.container}>
      {[0, 1, 2, 3, 4].map((dotIndex) => {
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
