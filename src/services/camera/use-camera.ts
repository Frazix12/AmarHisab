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
  const isCapturingRef = useRef(false);
  const captureSessionRef = useRef(0);

  useEffect(() => {
    if (deviceState.isFrontCamera) {
      setFlashMode("off");
    }
  }, [deviceState.isFrontCamera]);

  const toggleFlash = useCallback(() => {
    setFlashMode((current) => getNextFlashMode(current));
  }, []);

  const capturePhoto = useCallback(async () => {
    if (isCapturingRef.current) {
      return null;
    }

    isCapturingRef.current = true;
    setIsCapturing(true);
    const captureSession = ++captureSessionRef.current;

    const allowed = await permissions.ensurePermission();
    if (!allowed) {
      if (captureSession === captureSessionRef.current) {
        isCapturingRef.current = false;
        setIsCapturing(false);
      }
      return null;
    }

    try {
      const effectiveFlashMode = deviceState.isFrontCamera ? "off" : flashMode;
      const photoUri = await takePhotoWithCamera(cameraRef, effectiveFlashMode);
      if (captureSession !== captureSessionRef.current) {
        return null;
      }
      setCapturedPhotoUri(photoUri);
      return photoUri;
    } catch (error) {
      console.error("Failed to capture photo:", error);
      return null;
    } finally {
      if (captureSession === captureSessionRef.current) {
        isCapturingRef.current = false;
        setIsCapturing(false);
      }
    }
  }, [deviceState.isFrontCamera, flashMode, permissions]);

  const retakePhoto = useCallback(() => {
    setCapturedPhotoUri(null);
  }, []);

  const resetCamera = useCallback(() => {
    captureSessionRef.current += 1;
    isCapturingRef.current = false;
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
