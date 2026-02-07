import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { triggerLightHaptic } from "@/utils/haptics";
import { formatNumber, parseBanglaNumber } from "@/utils/format";
import React, { forwardRef, useMemo, useRef, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

interface BanglaNumberInputProps
  extends Omit<TextInputProps, "value" | "onChangeText"> {
  value: string;
  onChangeText: (value: string) => void;
  isBanglaMode: boolean;
}

const DIGIT_ROWS = [
  [
    { label: "১", value: "1" },
    { label: "২", value: "2" },
    { label: "৩", value: "3" },
  ],
  [
    { label: "৪", value: "4" },
    { label: "৫", value: "5" },
    { label: "৬", value: "6" },
  ],
  [
    { label: "৭", value: "7" },
    { label: "৮", value: "8" },
    { label: "৯", value: "9" },
  ],
  [
    { label: ".", value: "." },
    { label: "০", value: "0" },
    { label: "⌫", value: "backspace" },
  ],
] as const;

const sanitizeNumericValue = (value: string) => {
  const normalized = parseBanglaNumber(value);
  let nextValue = "";
  let hasDecimal = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const isDigit = char >= "0" && char <= "9";
    if (isDigit) {
      nextValue += char;
      continue;
    }
    if (char === "." && !hasDecimal) {
      hasDecimal = true;
      nextValue += char;
    }
  }

  return nextValue;
};

export const BanglaNumberInput = forwardRef<TextInput, BanglaNumberInputProps>(
  ({
    value,
    onChangeText,
    isBanglaMode,
    onFocus,
    onBlur,
    keyboardType,
    ...textInputProps
  },
  forwardedRef,
  ) => {
    const { colorScheme } = useApp();
    const colors = Colors[colorScheme];
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput | null>(null);

    const displayValue = useMemo(() => {
      if (!isBanglaMode || !value) return value;
      return formatNumber(value, "bn");
    }, [isBanglaMode, value]);

    const setRef = (node: TextInput | null) => {
      inputRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    const appendValue = (nextChar: string) => {
      if (nextChar === ".") {
        if (value.includes(".")) return;
        if (!value) {
          onChangeText("0.");
          return;
        }
      }

      onChangeText(`${value}${nextChar}`);
    };

    const handleKeyPress = (keyValue: string) => {
      if (keyValue === "backspace") {
        onChangeText(value.slice(0, -1));
        return;
      }

      appendValue(keyValue);
    };

    return (
      <>
        <TextInput
          {...textInputProps}
          ref={setRef}
          value={displayValue}
          onChangeText={(text) => onChangeText(sanitizeNumericValue(text))}
          onKeyPress={triggerLightHaptic}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          keyboardType={keyboardType ?? "decimal-pad"}
          showSoftInputOnFocus={!isBanglaMode}
          contextMenuHidden={isBanglaMode}
        />

        <Modal
          visible={isBanglaMode && isFocused}
          transparent
          animationType="slide"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={() => inputRef.current?.blur()}
        >
          <View style={styles.keyboardRoot}>
            <Pressable
              haptic="none"
              style={styles.keyboardDismissArea}
              onPress={() => inputRef.current?.blur()}
            />
            <View
              style={[
                styles.keypad,
                {
                  borderTopColor: colors.outline,
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
            >
              {DIGIT_ROWS.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.keypadRow}>
                  {row.map((key) => (
                    <Pressable
                      haptic="light"
                      key={key.label}
                      onPress={() => handleKeyPress(key.value)}
                      style={({ pressed }) => [
                        styles.key,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.outline,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.keyText, { color: colors.text }]}>
                        {key.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))}

              <View style={styles.actionsRow}>
                <Pressable
                  haptic="light"
                  onPress={() => onChangeText("")}
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.outline,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>মুছুন</Text>
                </Pressable>
                <Pressable
                  haptic="light"
                  onPress={() => inputRef.current?.blur()}
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[styles.actionButtonText, { color: colors.onPrimary }]}
                  >
                    সম্পন্ন
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  },
);

BanglaNumberInput.displayName = "BanglaNumberInput";

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  keyboardDismissArea: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
  },
  keypad: {
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  keypadRow: {
    flexDirection: "row",
    gap: 8,
  },
  key: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
});
