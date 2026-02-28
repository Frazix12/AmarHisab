import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking } from "react-native";
import { Camera, useCameraPermission } from "react-native-vision-camera";
import type { CameraPermissionStatus } from "react-native-vision-camera";

import { CameraPermissionState } from "./types";

const BLOCKED_STATUSES = new Set<CameraPermissionStatus>([
  "denied",
  "restricted",
]);

export const useCameraPermissions = (): CameraPermissionState => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [permissionStatus, setPermissionStatus] =
    useState<CameraPermissionStatus | null>(null);

  const refreshPermissionStatus = useCallback(() => {
    try {
      const status = Camera.getCameraPermissionStatus();
      setPermissionStatus(status);
    } catch (error) {
      console.warn("Failed to get camera permission status:", error);
      setPermissionStatus(null);
    }
  }, []);

  useEffect(() => {
    refreshPermissionStatus();
  }, [refreshPermissionStatus]);

  const requestAccess = useCallback(async () => {
    const granted = await requestPermission();
    refreshPermissionStatus();
    return granted;
  }, [refreshPermissionStatus, requestPermission]);

  const ensurePermission = useCallback(async () => {
    if (hasPermission) {
      return true;
    }
    return requestAccess();
  }, [hasPermission, requestAccess]);

  const openSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
      return true;
    } catch (error) {
      console.warn("Failed to open app settings:", error);
      return false;
    }
  }, []);

  const isPermissionDenied = useMemo(() => {
    if (!permissionStatus) {
      return false;
    }
    return BLOCKED_STATUSES.has(permissionStatus);
  }, [permissionStatus]);

  return {
    hasPermission,
    permissionStatus,
    isPermissionDenied,
    requestPermission: requestAccess,
    ensurePermission,
    openSettings,
  };
};
