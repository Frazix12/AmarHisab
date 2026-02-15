import type { RefObject } from "react";
import type { Camera, PhotoFile, TakePhotoOptions } from "react-native-vision-camera";

import { CameraFlashMode } from "./types";

export const CAMERA_FLASH_MODES: CameraFlashMode[] = ["off", "on", "auto"];

const normalizePhotoUri = (photoPath: string): string => {
  if (photoPath.startsWith("file://")) {
    return photoPath;
  }
  return `file://${photoPath}`;
};

const resolvePhotoUri = (photoFile: PhotoFile): string => {
  if (photoFile.path) {
    return normalizePhotoUri(photoFile.path);
  }
  throw new Error("Captured photo path is unavailable.");
};

export const getNextFlashMode = (current: CameraFlashMode): CameraFlashMode => {
  const currentIndex = CAMERA_FLASH_MODES.indexOf(current);
  const nextIndex = (currentIndex + 1) % CAMERA_FLASH_MODES.length;
  return CAMERA_FLASH_MODES[nextIndex];
};

export const buildPhotoOptions = (
  flashMode: CameraFlashMode,
): TakePhotoOptions => {
  return {
    flash: flashMode,
    enableShutterSound: false,
  };
};

export const takePhotoWithCamera = async (
  cameraRef: RefObject<Camera | null>,
  flashMode: CameraFlashMode,
): Promise<string> => {
  const camera = cameraRef.current;
  if (!camera) {
    throw new Error("Camera is not ready.");
  }

  const photo = await camera.takePhoto(buildPhotoOptions(flashMode));
  return resolvePhotoUri(photo);
};
