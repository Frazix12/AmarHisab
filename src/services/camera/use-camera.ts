import { useCallback, useEffect, useRef, useState } from "react";
import type { Camera } from "react-native-vision-camera";

import { getNextFlashMode, takePhotoWithCamera } from "./camera-service";
import { useCameraDevice } from "./use-camera-device";
import { useCameraPermissions } from "./use-camera-permissions";
import { CameraFlashMode, UseCameraState } from "./types";

export const useCamera = (): UseCameraState => {
  const cameraRef = useRef<Camera>(null);
  const permissions = useCameraPermissions();
  const deviceState = useCameraDevice();

  const [flashMode, setFlashMode] = useState<CameraFlashMode>("off");
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (deviceState.isFrontCamera) {
      setFlashMode("off");
    }
  }, [deviceState.isFrontCamera]);

  const toggleFlash = useCallback(() => {
    setFlashMode((current) => getNextFlashMode(current));
  }, []);

  const capturePhoto = useCallback(async () => {
    if (isCapturing) {
      return null;
    }

    const allowed = await permissions.ensurePermission();
    if (!allowed) {
      return null;
    }

    try {
      setIsCapturing(true);
      const effectiveFlashMode = deviceState.isFrontCamera ? "off" : flashMode;
      const photoUri = await takePhotoWithCamera(cameraRef, effectiveFlashMode);
      setCapturedPhotoUri(photoUri);
      return photoUri;
    } catch (error) {
      console.error("Failed to capture photo:", error);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [deviceState.isFrontCamera, flashMode, isCapturing, permissions]);

  const retakePhoto = useCallback(() => {
    setCapturedPhotoUri(null);
  }, []);

  const resetCamera = useCallback(() => {
    setCapturedPhotoUri(null);
    setFlashMode("off");
    setIsCapturing(false);
  }, []);

  return {
    ...permissions,
    ...deviceState,
    cameraRef,
    flashMode,
    capturedPhotoUri,
    isCapturing,
    toggleFlash,
    capturePhoto,
    retakePhoto,
    resetCamera,
  };
};
