import { useCallback, useState } from "react";
import { useCameraDevice as useVisionCameraDevice } from "react-native-vision-camera";
import type { CameraPosition } from "react-native-vision-camera";

import { CameraDeviceState } from "./types";

export const useCameraDevice = (): CameraDeviceState => {
  const [position, setPosition] = useState<CameraPosition>("back");
  const device = useVisionCameraDevice(position);

  const toggleCamera = useCallback(() => {
    setPosition((current) => (current === "back" ? "front" : "back"));
  }, []);

  return {
    position,
    isFrontCamera: position === "front",
    device,
    toggleCamera,
    setPosition,
  };
};
