import React from "react";
import { StyleSheet, View } from "react-native";
import type { RefObject } from "react";
import { Camera } from "react-native-vision-camera";
import type { CameraDevice } from "react-native-vision-camera";

interface CameraViewProps {
  cameraRef: RefObject<Camera | null>;
  device: CameraDevice;
  isActive: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({
  cameraRef,
  device,
  isActive,
}) => {
  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        photo
        isActive={isActive}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
});
