import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
import { LearningCandidate } from "@/types/template";
import {
    Cancel01Icon,
    Delete02Icon,
    Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

interface TemplateSuggestionCardProps {
  suggestion: LearningCandidate;
  onSave: () => void;
  onDismiss: (forever: boolean) => void;
  visible: boolean;
}

export const TemplateSuggestionCard: React.FC<TemplateSuggestionCardProps> = ({
  suggestion,
  onSave,
  onDismiss,
  visible,
}) => {
  const { colorScheme, settings, t, formatNumber } = useApp();
  const colors = Colors[colorScheme];

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));
  const [showUndo, setShowUndo] = useState(false);
  const [undoTimeout, setUndoTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleSave = () => {
    onSave();
    setShowUndo(true);

    // Auto-hide undo after 3 seconds
    const timeout = setTimeout(() => {
      setShowUndo(false);
    }, 3000);
    setUndoTimeout(timeout);
  };

  const handleUndo = () => {
    if (undoTimeout) {
      clearTimeout(undoTimeout);
    }
    setShowUndo(false);
    onDismiss(false); // Dismiss without marking as "never"
  };

  if (!visible && !showUndo) return null;

  if (showUndo) {
    return (
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.primaryContainer,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.undoContent}>
          <Text style={[styles.undoText, { color: colors.onPrimaryContainer }]}>
            ✅ {t.templates.templateSaved}
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
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View
          style={[styles.iconBadge, { backgroundColor: colors.primary + "20" }]}
        >
          <Text style={styles.iconEmoji}>🧠</Text>
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

      {/* Suggestion Details */}
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
            {formatNumber(suggestion.defaultPrice.toFixed(2))}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            {t.templates.purchased}:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {formatNumber(suggestion.occurrences)} {t.templates.usedTimes}
          </Text>
        </View>
      </View>

      {/* Actions */}
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
  iconEmoji: {
    fontSize: 20,
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
