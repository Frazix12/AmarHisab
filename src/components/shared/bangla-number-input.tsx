import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { triggerLightHaptic } from "@/utils/haptics";
import { formatNumber, parseBanglaNumber } from "@/utils/format";
import { Delete01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Key types for styling different button variants
type KeyType = "number" | "operator" | "action" | "done";

interface KeyConfig {
  label: string;
  value: string;
  type: KeyType;
}

const DIGIT_ROWS: KeyConfig[][] = [
  [
    { label: "১", value: "1", type: "number" },
    { label: "২", value: "2", type: "number" },
    { label: "৩", value: "3", type: "number" },
    { label: "−", value: "minus", type: "operator" },
  ],
  [
    { label: "৪", value: "4", type: "number" },
    { label: "৫", value: "5", type: "number" },
    { label: "৬", value: "6", type: "number" },
    { label: "␣", value: "space", type: "operator" },
  ],
  [
    { label: "৭", value: "7", type: "number" },
    { label: "৮", value: "8", type: "number" },
    { label: "৯", value: "9", type: "number" },
    { label: "", value: "backspace", type: "action" },
  ],
  [
    { label: ",", value: ",", type: "operator" },
    { label: "০", value: "0", type: "number" },
    { label: ".", value: ".", type: "operator" },
    { label: "", value: "done", type: "done" },
  ],
];

const sanitizeNumericValue = (value: string) => {
  const normalized = parseBanglaNumber(value);
  let nextValue = "";
  let hasDecimal = false;
  const hasLeadingMinus =
    value.trimStart().startsWith("-") || normalized.trimStart().startsWith("-");

  if (hasLeadingMinus) {
    nextValue = "-";
  }

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

    // Long-press backspace functionality
    const backspaceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const valueRef = useRef(value);

    // Keep valueRef in sync with value
    useEffect(() => {
      valueRef.current = value;
    }, [value]);

    const deleteOneChar = useCallback(() => {
      onChangeText(valueRef.current.slice(0, -1));
      triggerLightHaptic();
    }, [onChangeText]);

    const startBackspaceRepeat = useCallback(() => {
      // Delete immediately on press
      deleteOneChar();

      // Start repeating after a short delay
      const initialDelay = setTimeout(() => {
        backspaceIntervalRef.current = setInterval(() => {
          if (valueRef.current.length > 0) {
            deleteOneChar();
          } else {
            // Stop when empty
            if (backspaceIntervalRef.current) {
              clearInterval(backspaceIntervalRef.current);
              backspaceIntervalRef.current = null;
            }
          }
        }, 75); // Repeat every 75ms for fast deletion
      }, 400); // Wait 400ms before starting to repeat

      // Store timeout ref to clear it if released early
      backspaceIntervalRef.current = initialDelay as unknown as ReturnType<typeof setInterval>;
    }, [deleteOneChar]);

    const stopBackspaceRepeat = useCallback(() => {
      if (backspaceIntervalRef.current) {
        clearInterval(backspaceIntervalRef.current);
        clearTimeout(backspaceIntervalRef.current as unknown as ReturnType<typeof setTimeout>);
        backspaceIntervalRef.current = null;
      }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (backspaceIntervalRef.current) {
          clearInterval(backspaceIntervalRef.current);
        }
      };
    }, []);

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
      switch (keyValue) {
        case "done":
          inputRef.current?.blur();
          return;
        case "backspace":
          onChangeText(value.slice(0, -1));
          return;
        case "minus":
          // Only allow minus at the start
          if (value === "") {
            onChangeText("-");
          }
          return;
        case "space":
          // Space typically ignored in number input
          return;
        default:
          appendValue(keyValue);
      }
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
            <View style={styles.keypad}>
              {DIGIT_ROWS.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.keypadRow}>
                  {row.map((key) => {
                    const isDone = key.type === "done";
                    const isBackspace = key.value === "backspace";

                    return (
                      <Pressable
                        haptic={isBackspace ? "none" : "light"}
                        key={key.value}
                        onPress={isBackspace ? undefined : () => handleKeyPress(key.value)}
                        onPressIn={isBackspace ? startBackspaceRepeat : undefined}
                        onPressOut={isBackspace ? stopBackspaceRepeat : undefined}
                        style={({ pressed }) => [
                          styles.key,
                          isDone && styles.keyDone,
                          {
                            opacity: pressed ? 0.7 : 1,
                            transform: [{ scale: pressed ? 0.96 : 1 }],
                          },
                        ]}
                      >
                        {isBackspace ? (
                          <HugeiconsIcon
                            icon={Delete01Icon}
                            size={24}
                            color="#FFFFFF"
                            strokeWidth={2}
                          />
                        ) : isDone ? (
                          <HugeiconsIcon
                            icon={Tick02Icon}
                            size={26}
                            color="#FFFFFF"
                            strokeWidth={2.5}
                          />
                        ) : (
                          <Text
                            style={[
                              styles.keyText,
                              isDone && styles.keyTextDone,
                            ]}
                          >
                            {key.label}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
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
    backgroundColor: "transparent",
  },
  keypad: {
    backgroundColor: "#1C1C1C",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 8,
  },
  keypadRow: {
    flexDirection: "row",
    gap: 6,
  },
  key: {
    flex: 1,
    height: 56,
    backgroundColor: "#3D3D3D",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  keyDone: {
    backgroundColor: "#5DADE2",
  },
  keyText: {
    fontSize: 26,
    fontWeight: "400",
    lineHeight: 32,
    color: "#FFFFFF",
  },
  keyTextDone: {
    fontSize: 28,
    fontWeight: "600",
  },
});
