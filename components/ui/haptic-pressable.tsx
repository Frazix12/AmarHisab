import { HapticFeedbackType, triggerHaptic } from "@/utils/haptics";
import React, { useCallback, useRef } from "react";
import {
  GestureResponderEvent,
  Pressable as RNPressable,
  PressableProps,
} from "react-native";

interface HapticPressableProps extends PressableProps {
  haptic?: HapticFeedbackType;
  longPressHaptic?: HapticFeedbackType;
}

export const HapticPressable: React.FC<HapticPressableProps> = ({
  haptic = "heavy",
  longPressHaptic,
  onPress,
  onLongPress,
  disabled,
  ...props
}) => {
  const didLongPress = useRef(false);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (!onPress) {
        return;
      }

      if (didLongPress.current) {
        didLongPress.current = false;
        onPress(event);
        return;
      }

      if (!disabled) {
        triggerHaptic(haptic);
      }
      onPress(event);
    },
    [disabled, haptic, onPress],
  );

  const handleLongPress = useCallback(
    (event: GestureResponderEvent) => {
      didLongPress.current = true;
      if (!disabled) {
        triggerHaptic(longPressHaptic ?? haptic);
      }
      onLongPress?.(event);
    },
    [disabled, haptic, longPressHaptic, onLongPress],
  );

  return (
    <RNPressable
      {...props}
      disabled={disabled}
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
    />
  );
};
