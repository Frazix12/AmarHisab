import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { useModalAnimation } from "@/utils/animations";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React from "react";
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated from "react-native-reanimated";

export interface ActionMenuItem {
  label: string;
  icon: any; // HugeIcon
  onPress: () => void;
  variant?: "default" | "destructive";
}

interface ActionMenuModalProps {
  visible: boolean;
  onClose: () => void;
  actions: ActionMenuItem[];
  itemTitle: string;
}

const withAlpha = (color: string, alpha: number): string => {
  const normalizedAlpha = Math.max(0, Math.min(1, alpha));

  const hexMatch = color.trim().match(/^#([0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);

    if (hex.length === 8) {
      const existingAlpha = Number.parseInt(hex.slice(6, 8), 16) / 255;
      return `rgba(${r}, ${g}, ${b}, ${existingAlpha * normalizedAlpha})`;
    }

    return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
  }

  const rgbMatch = color
    .trim()
    .match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)$/i);
  if (rgbMatch) {
    const [, r, g, b, a] = rgbMatch;
    const existingAlpha = a ? Number.parseFloat(a) : 1;
    return `rgba(${r}, ${g}, ${b}, ${existingAlpha * normalizedAlpha})`;
  }

  return color;
};

export const ActionMenuModal: React.FC<ActionMenuModalProps> = ({
  visible,
  onClose,
  actions,
  itemTitle,
}) => {
  const { colorScheme } = useApp();
  const colors = Colors[colorScheme];
  const { animatedStyle, backdropStyle, shouldRender } = useModalAnimation(visible);

  const handleActionPress = (action: ActionMenuItem) => {
    onClose();
    // Small delay to let modal close animation complete
    setTimeout(() => action.onPress(), 200);
  };

  if (!shouldRender) return null;

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={onClose}
      accessibilityLabel={`Actions for ${itemTitle}`}
    >
      <Animated.View style={[styles.modalOverlay, backdropStyle]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.menuContent,
            { backgroundColor: colors.surface },
            animatedStyle,
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar}>
            <View
              style={[styles.handle, { backgroundColor: colors.outline }]}
            />
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {actions.map((action, index) => {
              const isDestructive = action.variant === "destructive";
              const iconColor = isDestructive ? colors.error : colors.text;
              const textColor = isDestructive ? colors.error : colors.text;

              return (
                <Pressable
                  key={index}
                  onPress={() => handleActionPress(action)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: pressed
                        ? colors.surfaceVariant
                        : "transparent",
                    },
                  ]}
                  accessibilityLabel={action.label}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: isDestructive
                          ? withAlpha(colors.error, 0.08)
                          : colors.primaryContainer,
                      },
                    ]}
                  >
                    <HugeiconsIcon
                      icon={action.icon}
                      size={22}
                      color={iconColor}
                      strokeWidth={2}
                    />
                  </View>
                  <Text style={[styles.actionLabel, { color: textColor }]}>
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Bottom Safe Area */}
          <View style={styles.bottomSpacer} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  menuContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  handleBar: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    flexShrink: 1,
    lineHeight: 22,
  },
  bottomSpacer: {
    height: Platform.OS === "ios" ? 30 : 20,
  },
});
