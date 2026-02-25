import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { withAlpha } from "@/utils/color";

type VoiceStatus = "idle" | "listening" | "processing" | "review";

interface VoiceStatusIndicatorProps {
  status: VoiceStatus;
  statusLabel: string;
  detectedLanguageLabel: string;
  readyPulseStyle: StyleProp<ViewStyle>;
  colors: {
    text: string;
    textSecondary: string;
    success: string;
    primary: string;
    surfaceVariant: string;
    outline: string;
  };
}

export const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  status,
  statusLabel,
  detectedLanguageLabel,
  readyPulseStyle,
  colors,
}) => {
  return (
    <View style={styles.statusRow}>
      <View style={styles.statusLeft}>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor:
                status === "listening"
                  ? withAlpha(colors.primary, 0.125)
                  : colors.surfaceVariant,
              borderColor: colors.outline,
            },
          ]}
        >
          {status === "idle" ? (
            <Animated.View
              style={[
                styles.readyIndicator,
                readyPulseStyle,
                {
                  backgroundColor: colors.success,
                  shadowColor: colors.success,
                },
              ]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : null}
          <Text style={[styles.statusText, { color: colors.text }]} numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {detectedLanguageLabel ? (
        <Text style={[styles.languageText, { color: colors.textSecondary }]}>
          {detectedLanguageLabel}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    flexWrap: "wrap",
    rowGap: 8,
    columnGap: 8,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  readyIndicator: {
    width: 10,
    height: 10,
    borderRadius: 999,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    flexShrink: 1,
  },
  languageText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    flexShrink: 1,
    textAlign: "right",
    minWidth: 0,
  },
});
