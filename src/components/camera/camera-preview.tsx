import { AppImage } from "@/components/ui/app-image";
import React from "react";
import { StyleSheet, View } from "react-native";

interface CameraPreviewProps {
  uri: string;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({ uri }) => {
  return (
    <View style={styles.container}>
      <AppImage uri={uri} style={StyleSheet.absoluteFillObject} contentFit="cover" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
});
