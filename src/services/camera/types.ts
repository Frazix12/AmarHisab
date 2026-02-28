import type {
  Camera,
  CameraDevice,
  CameraPermissionStatus,
  CameraPosition,
} from "react-native-vision-camera";
import type { RefObject } from "react";

export type CameraFlashMode = "off" | "on" | "auto";

export interface CameraPermissionState {
  hasPermission: boolean;
  permissionStatus: CameraPermissionStatus | null;
  isPermissionDenied: boolean;
  requestPermission: () => Promise<boolean>;
  ensurePermission: () => Promise<boolean>;
  /**
   * Wrapper around Linking.openSettings().
   * Returns true when the settings screen opens successfully, false when an error is caught.
   * This does not indicate whether the user changed any settings.
   */
  openSettings: () => Promise<boolean>;
}

export interface CameraDeviceState {
  position: CameraPosition;
  isFrontCamera: boolean;
  device: CameraDevice | undefined;
  toggleCamera: () => void;
  setPosition: (nextPosition: CameraPosition) => void;
}

export interface UseCameraState
  extends CameraPermissionState,
    CameraDeviceState {
  cameraRef: RefObject<Camera | null>;
  flashMode: CameraFlashMode;
  capturedPhotoUri: string | null;
  isCapturing: boolean;
  toggleFlash: () => void;
  capturePhoto: () => Promise<string | null>;
  retakePhoto: () => void;
  resetCamera: () => void;
}
