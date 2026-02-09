import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface SettingItemProps {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  title: string;
  value?: string;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
}

export const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  value,
  onPress,
  disabled = false,
  selected = false,
}) => {
  const { colorScheme } = useApp();
  const colors = Colors[colorScheme];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      style={({ pressed }) => [
        styles.settingItem,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outline,
          opacity: pressed && !disabled ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primaryContainer },
          ]}
        >
          <HugeiconsIcon
            icon={icon}
            size={22}
            color={colors.primary}
            strokeWidth={1.5}
          />
        </View>
        <Text
          style={[styles.settingTitle, { color: colors.text }]}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
      {value && (
        <Text
          style={[styles.settingValue, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {value}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    minHeight: 72,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    lineHeight: 22,
  },
  settingValue: {
    fontSize: 15,
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
    lineHeight: 20,
  },
});
