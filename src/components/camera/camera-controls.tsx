import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import { useI18n, useTheme } from "@/contexts/app-selectors";
import { withAlpha } from "@/utils/color";
import { Cancel01Icon, Sun03Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { CameraFlashMode } from "@/services/camera";

interface CameraControlsProps {
  isPreview: boolean;
  flashMode: CameraFlashMode;
  flashDisabled?: boolean;
  isCaptureDisabled?: boolean;
  canSwitchCamera?: boolean;
  onClose: () => void;
  onCapture: () => void;
  onToggleFlash: () => void;
  onSwitchCamera: () => void;
  onRetake: () => void;
  onUsePhoto: () => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  isPreview,
  flashMode,
  flashDisabled = false,
  isCaptureDisabled = false,
  canSwitchCamera = true,
  onClose,
  onCapture,
  onToggleFlash,
  onSwitchCamera,
  onRetake,
  onUsePhoto,
}) => {
  const colorScheme = useTheme();
  const { t } = useI18n();
  const colors = Colors[colorScheme];

  const flashLabel = useMemo(() => {
    if (flashMode === "on") {
      return t.camera.flashOn;
    }
    if (flashMode === "auto") {
      return t.camera.flashAuto;
    }
    return t.camera.flashOff;
  }, [flashMode, t.camera.flashAuto, t.camera.flashOff, t.camera.flashOn]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable
          haptic="medium"
          style={[styles.iconButton, { backgroundColor: withAlpha("#000000", 0.4) }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.camera.closeCamera}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={24} color="#FFFFFF" strokeWidth={2.2} />
        </Pressable>
      </View>

      {isPreview ? (
        <View style={styles.previewControls}>
          <Pressable
            haptic="medium"
            style={[
              styles.actionButton,
              {
                backgroundColor: withAlpha(colors.surface, 0.95),
              },
            ]}
            onPress={onRetake}
            accessibilityRole="button"
            accessibilityLabel={t.camera.retake}
          >
            <Text style={[styles.actionButtonText, { color: colors.text }]}>{t.camera.retake}</Text>
          </Pressable>

          <Pressable
            haptic="medium"
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={onUsePhoto}
            accessibilityRole="button"
            accessibilityLabel={t.camera.usePhoto}
          >
            <HugeiconsIcon icon={Tick02Icon} size={18} color={colors.onPrimary} strokeWidth={2.2} />
            <Text style={[styles.actionButtonText, { color: colors.onPrimary }]}> 
              {t.camera.usePhoto}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.captureControls}>
          <Pressable
            haptic="light"
            style={[
              styles.sideControl,
              {
                backgroundColor: withAlpha("#000000", 0.4),
                opacity: flashDisabled ? 0.5 : 1,
              },
            ]}
            onPress={onToggleFlash}
            disabled={flashDisabled}
            accessibilityRole="button"
            accessibilityLabel={flashLabel}
          >
            <HugeiconsIcon icon={Sun03Icon} size={20} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={[styles.sideControlLabel, flashDisabled ? styles.sideControlDisabledLabel : undefined]}>
              {flashMode.toUpperCase()}
            </Text>
          </Pressable>

          <Pressable
            haptic="heavy"
            style={[
              styles.captureButton,
              isCaptureDisabled ? styles.captureButtonDisabled : undefined,
            ]}
            onPress={onCapture}
            disabled={isCaptureDisabled}
            accessibilityRole="button"
            accessibilityLabel={t.camera.capturePhoto}
          >
            <View style={styles.captureInnerRing} />
          </Pressable>

          <Pressable
            haptic="light"
            style={[
              styles.sideControl,
              {
                backgroundColor: withAlpha("#000000", 0.4),
                opacity: canSwitchCamera ? 1 : 0.5,
              },
            ]}
            onPress={onSwitchCamera}
            disabled={!canSwitchCamera}
            accessibilityRole="button"
            accessibilityLabel={t.camera.switchCamera}
          >
            <Text style={styles.sideControlLabel}>{t.camera.flip}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  captureControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideControl: {
    width: 74,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  sideControlLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  sideControlDisabledLabel: {
    opacity: 0.6,
  },
  captureButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#FFFFFF", 0.25),
  },
  captureButtonDisabled: {
    opacity: 0.45,
  },
  captureInnerRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#FFFFFF",
  },
  previewControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
