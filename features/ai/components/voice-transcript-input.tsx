import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import {
  AiMicIcon,
  Cancel01Icon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React from "react";
import { Control, Controller } from "react-hook-form";
import { StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

type VoiceStatus = "idle" | "listening" | "processing" | "review";

interface VoiceTranscriptFormValues {
  transcript: string;
}

interface VoiceTranscriptInputProps {
  status: VoiceStatus;
  transcriptControl: Control<VoiceTranscriptFormValues>;
  canSendText: boolean;
  hasError: boolean;
  onClearError: () => void;
  onSendText: () => void;
  onToggleMicrophone: () => void;
  labels: {
    listening: string;
    processing: string;
    transcriptPlaceholder: string;
    sendText: string;
    startListening: string;
    stopListening: string;
  };
  colors: {
    text: string;
    textSecondary: string;
    error: string;
    primary: string;
    onPrimary: string;
    surface: string;
    outline: string;
  };
  recordingDotStyle: StyleProp<ViewStyle>;
  waveBarOneStyle: StyleProp<ViewStyle>;
  waveBarTwoStyle: StyleProp<ViewStyle>;
  waveBarThreeStyle: StyleProp<ViewStyle>;
  micIconContainerStyle: StyleProp<ViewStyle>;
  micIconStyle: StyleProp<ViewStyle>;
  closeIconStyle: StyleProp<ViewStyle>;
}

export const VoiceTranscriptInput: React.FC<VoiceTranscriptInputProps> = ({
  status,
  transcriptControl,
  canSendText,
  hasError,
  onClearError,
  onSendText,
  onToggleMicrophone,
  labels,
  colors,
  recordingDotStyle,
  waveBarOneStyle,
  waveBarTwoStyle,
  waveBarThreeStyle,
  micIconContainerStyle,
  micIconStyle,
  closeIconStyle,
}) => {
  return (
    <View style={styles.textEntrySection}>
      <View style={styles.inputActionRow}>
        <View
          style={[
            styles.transcriptInputWrapper,
            {
              borderColor: colors.outline,
              backgroundColor: colors.surface,
            },
          ]}
        >
          {status === "listening" ? (
            <View style={styles.transcriptListeningInline}>
              <Animated.View
                style={[
                  styles.recordingDot,
                  recordingDotStyle,
                  {
                    backgroundColor: colors.error,
                    shadowColor: colors.error,
                  },
                ]}
              />
              <Text style={[styles.recordingText, { color: colors.text }]}>
                {labels.listening}
              </Text>
              <View style={styles.recordingWaveInline}>
                <Animated.View
                  style={[
                    styles.recordingWaveBar,
                    { backgroundColor: colors.primary },
                    waveBarOneStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.recordingWaveBar,
                    { backgroundColor: colors.primary },
                    waveBarTwoStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.recordingWaveBar,
                    { backgroundColor: colors.primary },
                    waveBarThreeStyle,
                  ]}
                />
              </View>
            </View>
          ) : (
            <Controller
              control={transcriptControl}
              name="transcript"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.transcriptInput,
                    {
                      color: colors.text,
                    },
                  ]}
                  placeholder={
                    status === "processing"
                      ? labels.processing
                      : labels.transcriptPlaceholder
                  }
                  placeholderTextColor={colors.textSecondary}
                  multiline={false}
                  editable={status !== "processing"}
                  value={value}
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    if (canSendText) {
                      onSendText();
                    }
                  }}
                  onChangeText={(text) => {
                    onChange(text);
                    if (hasError) {
                      onClearError();
                    }
                  }}
                />
              )}
            />
          )}
        </View>

        <Pressable
          onPress={onSendText}
          disabled={!canSendText}
          style={[
            styles.circleActionButton,
            {
              backgroundColor: canSendText ? colors.primary : colors.surface,
              borderColor: canSendText ? colors.primary : colors.outline,
              opacity: canSendText ? 1 : 0.55,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={labels.sendText}
        >
          <HugeiconsIcon
            icon={SentIcon}
            size={18}
            color={canSendText ? colors.onPrimary : colors.textSecondary}
            strokeWidth={2.2}
          />
        </Pressable>

        <Pressable
          onPress={onToggleMicrophone}
          disabled={status === "processing"}
          style={[
            styles.circleActionButton,
            {
              backgroundColor:
                status === "listening" ? colors.error + "18" : colors.surface,
              borderColor: status === "listening" ? colors.error : colors.outline,
              opacity: status === "processing" ? 0.55 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            status === "listening" ? labels.stopListening : labels.startListening
          }
        >
          <Animated.View style={[styles.actionIconContainer, micIconContainerStyle]}>
            <Animated.View style={[styles.actionIconLayer, micIconStyle]}>
              <HugeiconsIcon
                icon={AiMicIcon}
                size={18}
                color={colors.textSecondary}
                strokeWidth={2.2}
              />
            </Animated.View>
            <Animated.View
              style={[styles.actionIconLayer, styles.actionIconOverlay, closeIconStyle]}
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                size={18}
                color={colors.error}
                strokeWidth={2.2}
              />
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  textEntrySection: {
    marginTop: 16,
  },
  inputActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  transcriptInputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: "center",
  },
  circleActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionIconContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconLayer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  transcriptInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    paddingHorizontal: 0,
    paddingVertical: 0,
    height: "100%",
  },
  transcriptListeningInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  recordingText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    flex: 1,
  },
  recordingWaveInline: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 18,
    marginLeft: "auto",
  },
  recordingWaveBar: {
    width: 4,
    borderRadius: 4,
    minHeight: 7,
  },
});
