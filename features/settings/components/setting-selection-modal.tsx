import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { useReducedMotionPreference } from "@/utils/animations";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useCallback } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    SlideInDown,
    SlideOutDown,
} from "react-native-reanimated";

interface Option {
  label: string;
  value: string;
  icon?: any;
}

interface SettingSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: Option[];
  currentValue: string;
  onSelect: (value: string) => void;
}

export const SettingSelectionModal = ({
  visible,
  onClose,
  title,
  options,
  currentValue,
  onSelect,
}: SettingSelectionModalProps) => {
  const { colorScheme } = useApp();
  const colors = Colors[colorScheme];
  const reduceMotion = useReducedMotionPreference();

  const overlayEntering = reduceMotion
    ? FadeIn.duration(0)
    : FadeIn.duration(180);
  const overlayExiting = reduceMotion
    ? FadeOut.duration(0)
    : FadeOut.duration(160);
  const contentEntering = reduceMotion
    ? SlideInDown.duration(0)
    : SlideInDown.springify().damping(30).stiffness(300).mass(1);
  const contentExiting = reduceMotion
    ? SlideOutDown.duration(0)
    : SlideOutDown.duration(180);

  const renderOption = useCallback(
    ({ item: option }: { item: Option }) => {
      const isSelected = option.value === currentValue;
      return (
        <Pressable
          onPress={() => {
            onSelect(option.value);
            onClose();
          }}
          style={({ pressed }) => [
            styles.optionItem,
            {
              backgroundColor: pressed
                ? colors.surfaceVariant
                : "transparent",
              borderColor: colors.outline,
            },
          ]}
        >
          <View style={styles.optionLeft}>
            {option.icon && (
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isSelected
                      ? colors.primaryContainer
                      : colors.surfaceVariant,
                  },
                ]}
              >
                <HugeiconsIcon
                  icon={option.icon}
                  size={24}
                  color={isSelected ? colors.primary : colors.textSecondary}
                  strokeWidth={1.5}
                />
              </View>
            )}
            <Text
              style={[
                styles.optionLabel,
                {
                  color: isSelected ? colors.primary : colors.text,
                  fontWeight: isSelected ? "600" : "400",
                },
              ]}
            >
              {option.label}
            </Text>
          </View>

          {isSelected && (
            <View style={styles.checkIcon}>
              <HugeiconsIcon
                icon={Tick02Icon}
                size={24}
                color={colors.primary}
                strokeWidth={2}
              />
            </View>
          )}
        </Pressable>
      );
    },
    [colors, currentValue, onClose, onSelect],
  );

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          entering={overlayEntering}
          exiting={overlayExiting}
          style={styles.overlay}
        >
          <View style={styles.backdrop} />
        </Animated.View>
      </TouchableWithoutFeedback>

      <View style={styles.modalContainer} pointerEvents="box-none">
        <Animated.View
          entering={contentEntering}
          exiting={contentExiting}
          style={[
            styles.modalContent,
            { backgroundColor: colors.surface, paddingBottom: 40 },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.dragIndicator,
                { backgroundColor: colors.outline },
              ]}
            />
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </View>

          {/* Options List */}
          <FlatList
            data={options}
            keyExtractor={(option) => option.value}
            renderItem={renderOption}
            style={styles.optionsList}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    opacity: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  optionsList: {
    width: "100%",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 16,
  },
  checkIcon: {
    marginLeft: 12,
  },
});
