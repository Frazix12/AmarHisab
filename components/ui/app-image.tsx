import React from "react";
import { Image, ImageProps } from "expo-image";

interface AppImageProps extends Omit<ImageProps, "source"> {
  uri?: string | null;
}

export const AppImage: React.FC<AppImageProps> = ({
  uri,
  contentFit = "cover",
  transition = 120,
  cachePolicy = "disk",
  ...props
}) => {
  if (!uri) {
    return null;
  }

  return (
    <Image
      source={{ uri }}
      contentFit={contentFit}
      transition={transition}
      cachePolicy={cachePolicy}
      {...props}
    />
  );
};
