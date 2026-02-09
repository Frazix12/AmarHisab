import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { LearningCandidate } from "@/types/template";
import { useReducedMotionPreference } from "@/utils/animations";
import {
  ArtificialIntelligence04Icon,
  Cancel01Icon,
  Delete02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface TemplateSuggestionCardProps {
  suggestion: LearningCandidate;
  onSave: () => void;
  onDismiss: (forever: boolean) => void;
  visible: boolean;
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

export const TemplateSuggestionCard: React.FC<TemplateSuggestionCardProps> = ({
  suggestion,
  onSave,
  onDismiss,
  visible,
}) => {
  const { colorScheme, settings, t, formatNumber } = useApp();
  const colors = Colors[colorScheme];

  const reduceMotion = useReducedMotionPreference();
  const [shouldRender, setShouldRender] = useState(visible);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useSharedValue(visible ? 1 : 0);

  const isOpen = visible || showUndo;

  useEffect(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (isOpen) {
      setShouldRender(true);
      progress.value = reduceMotion
        ? withTiming(1, { duration: 0 })
        : withSpring(1, {
            damping: 18,
            stiffness: 220,
            mass: 0.9,
          });
      return;
    }

    progress.value = withTiming(0, {
      duration: reduceMotion ? 0 : 180,
      easing: Easing.in(Easing.cubic),
    });

    if (reduceMotion) {
      setShouldRender(false);
      return;
    }

    hideTimeoutRef.current = setTimeout(() => {
      setShouldRender(false);
    }, 180);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isOpen, progress, reduceMotion]);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [-10, 0], Extrapolation.CLAMP),
      },
      {
        scale: interpolate(progress.value, [0, 1], [0.98, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  const handleSave = () => {
    onSave();
    setShowUndo(true);

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    undoTimeoutRef.current = setTimeout(() => {
      setShowUndo(false);
    }, 3000);
  };

  const handleUndo = () => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    setShowUndo(false);
    onDismiss(false);
  };

  if (!shouldRender) return null;

  if (showUndo) {
    return (
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.primaryContainer,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.undoContent}>
          <Text style={[styles.undoText, { color: colors.onPrimaryContainer }]}>
            {t.templates.templateSaved}
          </Text>
          <Pressable onPress={handleUndo} style={styles.undoButton}>
            <Text style={[styles.undoButtonText, { color: colors.primary }]}>
              {t.templates.undo}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primary,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <View
          style={[styles.iconBadge, { backgroundColor: withAlpha(colors.primary, 0.125) }]}
        >
          <HugeiconsIcon
            icon={ArtificialIntelligence04Icon}
            size={20}
            color={colors.primary}
            strokeWidth={2}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}> 
            {t.templates.saveAsTemplateTitle}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}> 
            {t.templates.saveAsTemplateSubtitle.replace(
              "{name}",
              suggestion.productName,
            )}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}> 
            {t.templates.typicalQuantity}:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}> 
            {suggestion.defaultQuantity}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}> 
            {t.templates.avgPrice}:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}> 
            {settings.currency.symbol}
            {formatNumber(Math.round(suggestion.defaultPrice * 100) / 100)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}> 
            {t.templates.purchased}:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}> 
            {t.templates.usageDisplay.replace(
              "{count}",
              formatNumber(suggestion.occurrences),
            )}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => onDismiss(true)}
          style={[
            styles.actionButton,
            styles.neverButton,
            { backgroundColor: colors.surfaceVariant },
          ]}
        >
          <HugeiconsIcon icon={Delete02Icon} size={16} color={colors.error} />
          <Text style={[styles.actionButtonText, { color: colors.error }]}> 
            {t.templates.never}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onDismiss(false)}
          style={[
            styles.actionButton,
            styles.notNowButton,
            { backgroundColor: colors.surfaceVariant },
          ]}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} color={colors.text} />
          <Text style={[styles.actionButtonText, { color: colors.text }]}> 
            {t.templates.notNow}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSave}
          style={[
            styles.actionButton,
            styles.saveButton,
            { backgroundColor: colors.primary },
          ]}
        >
          <HugeiconsIcon icon={Tick02Icon} size={16} color="#fff" />
          <Text style={[styles.actionButtonText, { color: "#fff" }]}> 
            {t.form.save}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  details: {
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 4,
  },
  detailLabel: {
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
    flexShrink: 1,
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  neverButton: {
    flex: 1,
  },
  notNowButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  undoContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  undoText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
  undoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  undoButtonText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
});
