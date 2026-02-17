import { CameraControls } from "@/components/camera/camera-controls";
import { CameraPreview } from "@/components/camera/camera-preview";
import { CameraView } from "@/components/camera/camera-view";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { Colors } from "@/constants/theme";
import { useI18n, useTheme } from "@/contexts/app-selectors";
import { useCamera } from "@/services/camera";
import { useModalAnimation } from "@/utils/animations";
import { withAlpha } from "@/utils/color";
import React, { useCallback, useEffect } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

interface CameraModalProps {
  visible: boolean;
  onCapture: (uri: string) => void;
  onClose: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  visible,
  onCapture,
  onClose,
}) => {
  const colorScheme = useTheme();
  const { t } = useI18n();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { animatedStyle, backdropStyle, shouldRender } = useModalAnimation(visible);

  const {
    hasPermission,
    isPermissionDenied,
    requestPermission,
    openSettings,
    device,
    flashMode,
    isFrontCamera,
    capturedPhotoUri,
    isCapturing,
    toggleFlash,
    toggleCamera,
    capturePhoto,
    retakePhoto,
    resetCamera,
    cameraRef,
  } = useCamera();

  useEffect(() => {
    if (!visible) {
      resetCamera();
    }
  }, [resetCamera, visible]);

  const handleClose = useCallback(() => {
    resetCamera();
    onClose();
  }, [onClose, resetCamera]);

  const handleUsePhoto = useCallback(() => {
    if (!capturedPhotoUri) {
      return;
    }
    onCapture(capturedPhotoUri);
    handleClose();
  }, [capturedPhotoUri, handleClose, onCapture]);

  const handleRequestPermission = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <Animated.View style={[styles.modalOverlay, backdropStyle]}>
        <Animated.View style={[styles.modalContent, animatedStyle]}>
          {!hasPermission ? (
            <View style={styles.permissionRoot}>
              <View
                style={[
                  styles.permissionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.outline,
                  },
                ]}
              >
                <Text style={[styles.permissionTitle, { color: colors.text }]}>
                  {t.form.permission}
                </Text>
                <Text
                  style={[styles.permissionDescription, { color: colors.textSecondary }]}
                >
                  {t.alerts.cameraPermission}
                </Text>
                <Pressable
                  haptic="medium"
                  onPress={handleRequestPermission}
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel={t.camera.allowCamera}
                >
                  <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
                    {t.camera.allowCamera}
                  </Text>
                </Pressable>

                {isPermissionDenied ? (
                  <Pressable
                    haptic="light"
                    onPress={openSettings}
                    style={[
                      styles.secondaryButton,
                      {
                        backgroundColor: colors.surfaceVariant,
                        borderColor: colors.outline,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t.camera.openSettings}
                  >
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                      {t.camera.openSettings}
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  haptic="none"
                  onPress={handleClose}
                  style={styles.dismissButton}
                  accessibilityRole="button"
                  accessibilityLabel={t.camera.closeCamera}
                >
                  <Text style={[styles.dismissButtonText, { color: colors.textSecondary }]}>
                    {t.form.cancel}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : !device ? (
            <View style={styles.permissionRoot}>
              <View
                style={[
                  styles.permissionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.outline,
                  },
                ]}
              >
                <Text style={[styles.permissionTitle, { color: colors.text }]}>
                  {t.camera.cameraUnavailableTitle}
                </Text>
                <Text style={[styles.permissionDescription, { color: colors.textSecondary }]}>
                  {t.camera.cameraUnavailableMessage}
                </Text>
                <Pressable
                  haptic="none"
                  onPress={handleClose}
                  style={styles.dismissButton}
                  accessibilityRole="button"
                  accessibilityLabel={t.camera.closeCamera}
                >
                  <Text style={[styles.dismissButtonText, { color: colors.textSecondary }]}>
                    {t.camera.close}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.cameraRoot}>
              {capturedPhotoUri ? (
                <CameraPreview uri={capturedPhotoUri} />
              ) : (
                <CameraView
                  cameraRef={cameraRef}
                  device={device}
                  isActive={visible && !capturedPhotoUri}
                />
              )}

              <View
                style={[
                  styles.topScrim,
                  {
                    height: insets.top + 76,
                    backgroundColor: withAlpha("#000000", 0.26),
                  },
                ]}
              />

              <View
                style={[
                  styles.bottomScrim,
                  {
                    paddingBottom: Math.max(insets.bottom, 12),
                    backgroundColor: withAlpha("#000000", 0.34),
                  },
                ]}
              >
                <CameraControls
                  isPreview={!!capturedPhotoUri}
                  flashMode={flashMode}
                  flashDisabled={isFrontCamera}
                  isCaptureDisabled={isCapturing}
                  canSwitchCamera={!capturedPhotoUri}
                  onClose={handleClose}
                  onCapture={() => {
                    void capturePhoto();
                  }}
                  onToggleFlash={toggleFlash}
                  onSwitchCamera={toggleCamera}
                  onRetake={retakePhoto}
                  onUsePhoto={handleUsePhoto}
                />
              </View>

              {!capturedPhotoUri ? (
                <View style={[styles.hintPill, { top: insets.top + 14 }]}> 
                  <Text style={styles.hintText}>
                    {isFrontCamera ? t.camera.frontCamera : t.camera.backCamera}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "#000000",
  },
  modalContent: {
    flex: 1,
  },
  cameraRoot: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  bottomScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 210,
  },
  permissionRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#000000",
  },
  permissionCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    marginBottom: 6,
  },
  permissionDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  dismissButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  hintPill: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: withAlpha("#000000", 0.55),
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  hintText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
