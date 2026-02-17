import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type VoiceLanguageMode = "auto" | "en" | "bn";

interface VoiceLanguageOption {
  value: VoiceLanguageMode;
  label: string;
}

interface VoiceLanguageSelectorProps {
  label: string;
  options: readonly VoiceLanguageOption[];
  value: VoiceLanguageMode;
  onChange: (value: VoiceLanguageMode) => void;
  colors: {
    text: string;
    primary: string;
    primaryContainer: string;
    surfaceVariant: string;
    outline: string;
  };
}

export const VoiceLanguageSelector: React.FC<VoiceLanguageSelectorProps> = ({
  label,
  options,
  value,
  onChange,
  colors,
}) => {
  return (
    <View style={styles.languageSelector}>
      <Text style={[styles.selectorLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.selectorRow}>
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <Pressable
              haptic="medium"
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${option.label}${isActive ? " selected" : ""}`}
              accessibilityHint="Double tap to choose this language"
              style={[
                styles.selectorOption,
                {
                  backgroundColor: isActive
                    ? colors.primaryContainer
                    : colors.surfaceVariant,
                  borderColor: isActive ? colors.primary : colors.outline,
                },
              ]}
            >
              <Text
                style={[
                  styles.selectorOptionText,
                  { color: isActive ? colors.primary : colors.text },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  languageSelector: {
    marginTop: 16,
    gap: 8,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  selectorRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    rowGap: 8,
  },
  selectorOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  selectorOptionText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
});
