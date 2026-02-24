import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { showToast } from "@/components/ui/toast";
import { Colors } from "@/constants/theme";
import {
  useExpenseDomain,
  useGroceryDomain,
  useI18n,
  useSettingsDomain,
  useTheme,
} from "@/contexts/app-selectors";
import { EditExpenseModal } from "@/features/ai/components/edit-expense-modal";
import { EditGroceryModal } from "@/features/ai/components/edit-grocery-modal";
import { VoiceLanguageSelector } from "@/features/ai/components/voice-language-selector";
import { VoiceReviewSection } from "@/features/ai/components/voice-review-section";
import { VoiceStatusIndicator } from "@/features/ai/components/voice-status-indicator";
import { VoiceTranscriptInput } from "@/features/ai/components/voice-transcript-input";
import { AudioRecord } from "@/services/ai/audio-record";
import { getElevenLabsApiKey, transcribeAudioFile } from "@/services/ai/elevenlabs";
import {
  detectExpenseCategory,
  detectItemCategory,
  parseVoiceInput,
  VoiceParsedExpense,
  VoiceParsedGrocery,
  VoiceParsedResult,
} from "@/services/ai/gemini";
import { AnalyticsEvents, trackEvent } from "@/services/analytics";
import {
  ExpenseCategory,
  GroceryCategory,
} from "@/types";
import { useModalAnimation } from "@/utils/animations";
import {
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useForm } from "react-hook-form";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface VoiceAssistantModalProps {
  visible: boolean;
  onClose: () => void;
}

type VoiceStatus = "idle" | "listening" | "processing" | "review";
type VoiceLanguageMode = "auto" | "en" | "bn";

interface VoiceTranscriptFormValues {
  transcript: string;
}

const AUDIO_SAMPLE_RATE = 16000;
const isAudioRecordAvailable = () => AudioRecord.isAvailable();

const normalizeSpeechText = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const resolveLanguageCode = (languageCode: string | null) => {
  if (!languageCode) return "";
  const normalized = languageCode.toLowerCase();
  if (normalized.startsWith("bn")) return "bn";
  if (normalized.startsWith("en")) return "en";
  return normalized;
};

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  visible,
  onClose,
}) => {
  const { addExpense } = useExpenseDomain();
  const { addGroceryItem } = useGroceryDomain();
  const { settings } = useSettingsDomain();
  const colorScheme = useTheme();
  const { t, formatNumber } = useI18n();
  const colors = Colors[colorScheme];
  const { animatedStyle, backdropStyle, shouldRender } = useModalAnimation(visible);

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const {
    control: transcriptControl,
    handleSubmit: handleTranscriptSubmit,
    reset: resetTranscriptForm,
    setValue: setTranscriptValue,
    watch: watchTranscript,
  } = useForm<VoiceTranscriptFormValues>({
    defaultValues: {
      transcript: "",
    },
  });
  const transcript = watchTranscript("transcript");
  const [parsedResult, setParsedResult] = useState<VoiceParsedResult | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [languageMode, setLanguageMode] = useState<VoiceLanguageMode>("auto");
  const [editingExpense, setEditingExpense] = useState<{
    index: number;
    item: VoiceParsedExpense;
  } | null>(null);
  const [editingGrocery, setEditingGrocery] = useState<{
    index: number;
    item: VoiceParsedGrocery;
  } | null>(null);

  const isListeningRef = useRef(false);
  const voiceInputModeRef = useRef<"mic" | "typed" | null>(null);
  const voiceInputStartedAtMsRef = useRef<number | null>(null);
  const readyPulse = useSharedValue(1);
  const readyOpacity = useSharedValue(0.55);
  const recordingDotScale = useSharedValue(1);
  const recordingDotOpacity = useSharedValue(0.6);
  const waveBarOne = useSharedValue(0.35);
  const waveBarTwo = useSharedValue(0.35);
  const waveBarThree = useSharedValue(0.35);
  const micToCloseProgress = useSharedValue(0);

  useEffect(() => {
    if (status === "idle" && visible) {
      readyPulse.value = withRepeat(
        withTiming(1.35, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
      readyOpacity.value = withRepeat(
        withTiming(0.9, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    } else {
      readyPulse.value = withTiming(1, { duration: 180 });
      readyOpacity.value = withTiming(0.55, { duration: 180 });
    }
  }, [status, visible, readyPulse, readyOpacity]);

  useEffect(() => {
    if (status === "listening" && visible) {
      recordingDotScale.value = withRepeat(
        withTiming(1.24, {
          duration: 520,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
      recordingDotOpacity.value = withRepeat(
        withTiming(1, {
          duration: 520,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );

      waveBarOne.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: 250,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.35, {
            duration: 260,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      );

      waveBarTwo.value = withRepeat(
        withSequence(
          withTiming(0.6, {
            duration: 140,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: 250,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.35, {
            duration: 260,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      );

      waveBarThree.value = withRepeat(
        withSequence(
          withTiming(0.45, {
            duration: 220,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: 250,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.35, {
            duration: 260,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      );
    } else {
      recordingDotScale.value = withTiming(1, { duration: 180 });
      recordingDotOpacity.value = withTiming(0.6, { duration: 180 });
      waveBarOne.value = withTiming(0.35, { duration: 180 });
      waveBarTwo.value = withTiming(0.35, { duration: 180 });
      waveBarThree.value = withTiming(0.35, { duration: 180 });
    }
  }, [
    status,
    visible,
    recordingDotScale,
    recordingDotOpacity,
    waveBarOne,
    waveBarTwo,
    waveBarThree,
  ]);

  useEffect(() => {
    micToCloseProgress.value = withTiming(status === "listening" ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [status, micToCloseProgress]);

  const readyPulseStyle = useAnimatedStyle(() => ({
    opacity: readyOpacity.value,
    transform: [{ scale: readyPulse.value }],
  }));

  const recordingDotStyle = useAnimatedStyle(() => ({
    opacity: recordingDotOpacity.value,
    transform: [{ scale: recordingDotScale.value }],
  }));

  const waveBarOneStyle = useAnimatedStyle(() => ({
    height: 7 + waveBarOne.value * 14,
  }));

  const waveBarTwoStyle = useAnimatedStyle(() => ({
    height: 7 + waveBarTwo.value * 14,
  }));

  const waveBarThreeStyle = useAnimatedStyle(() => ({
    height: 7 + waveBarThree.value * 14,
  }));

  const micIconContainerStyle = useAnimatedStyle(() => {
    const rotation = interpolate(micToCloseProgress.value, [0, 1], [0, 90]);
    return {
      transform: [
        {
          rotate: `${rotation}deg`,
        },
      ],
    };
  });

  const micIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - micToCloseProgress.value,
    transform: [
      {
        scale: interpolate(micToCloseProgress.value, [0, 1], [1, 0.72]),
      },
    ],
  }));

  const closeIconStyle = useAnimatedStyle(() => ({
    opacity: micToCloseProgress.value,
    transform: [
      {
        scale: interpolate(micToCloseProgress.value, [0, 1], [0.72, 1]),
      },
    ],
  }));

  const displayTranscript = useMemo(() => {
    if (!transcript) return "";
    return normalizeSpeechText(transcript);
  }, [transcript]);

  const canSendText =
    status !== "listening" &&
    status !== "processing" &&
    displayTranscript.length > 0;

  const resetState = useCallback(() => {
    setStatus("idle");
    resetTranscriptForm({ transcript: "" });
    setParsedResult(null);
    setErrorMessage(null);
    setDetectedLanguage(null);
    voiceInputModeRef.current = null;
    voiceInputStartedAtMsRef.current = null;
  }, [resetTranscriptForm]);

  const getVoiceInputDurationMs = (): number | undefined => {
    const startedAt = voiceInputStartedAtMsRef.current;
    if (!startedAt) return undefined;
    const duration = Date.now() - startedAt;
    return Number.isFinite(duration) && duration >= 0 ? duration : undefined;
  };

  const trackVoiceInputFailed = (stage: string, error?: unknown): void => {
    const durationMs = getVoiceInputDurationMs();

    trackEvent(AnalyticsEvents.VOICE_INPUT_FAILED, {
      mode: voiceInputModeRef.current ?? "unknown",
      stage,
      language_mode: languageMode,
      settings_language: settings.language,
      detected_language: resolveLanguageCode(detectedLanguage),
      ...(durationMs !== undefined ? { duration_ms: durationMs } : {}),
      error_type: error instanceof Error ? error.name : error ? typeof error : "unknown",
    });
  };

  const cleanupSession = useCallback(async () => {
    if (isListeningRef.current) {
      isListeningRef.current = false;
      try {
        if (isAudioRecordAvailable()) {
          await AudioRecord.stop();
        }
      } catch (error) {
        console.warn("Failed to stop audio recording", error);
      }
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      cleanupSession();
      resetState();
    }
  }, [visible, cleanupSession, resetState]);

  const requestAudioPermission = async () => {
    if (Platform.OS !== "android") return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const autoAssignCategories = async (result: VoiceParsedResult) => {
    const expenses = await Promise.all(
      result.expenses.map(async (item) => {
        if (item.category) return item;
        try {
          const detected = await detectExpenseCategory(item.description);
          return {
            ...item,
            category: (detected as ExpenseCategory) || "other",
          };
        } catch (error) {
          console.warn("Failed to detect expense category", error);
          return { ...item, category: "other" as ExpenseCategory };
        }
      }),
    );

    const groceries = await Promise.all(
      result.groceries.map(async (item) => {
        if (item.category) return item;
        try {
          const detected = await detectItemCategory(item.name);
          return {
            ...item,
            category: (detected as GroceryCategory) || "other",
          };
        } catch (error) {
          console.warn("Failed to detect grocery category", error);
          return { ...item, category: "other" as GroceryCategory };
        }
      }),
    );

    return { expenses, groceries };
  };

  const startListening = async () => {
    if (Platform.OS === "web") {
      setErrorMessage(t.voice.webNotSupported);
      voiceInputModeRef.current = "mic";
      voiceInputStartedAtMsRef.current = Date.now();
      trackVoiceInputFailed("web_not_supported");
      voiceInputModeRef.current = null;
      voiceInputStartedAtMsRef.current = null;
      return;
    }

    if (!isAudioRecordAvailable()) {
      setErrorMessage(t.voice.missingRecorder);
      voiceInputModeRef.current = "mic";
      voiceInputStartedAtMsRef.current = Date.now();
      trackVoiceInputFailed("recorder_unavailable");
      voiceInputModeRef.current = null;
      voiceInputStartedAtMsRef.current = null;
      return;
    }

    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      setErrorMessage(t.voice.micPermission);
      voiceInputModeRef.current = "mic";
      voiceInputStartedAtMsRef.current = Date.now();
      trackVoiceInputFailed("permission_denied");
      voiceInputModeRef.current = null;
      voiceInputStartedAtMsRef.current = null;
      return;
    }

    setErrorMessage(null);
    setParsedResult(null);
    resetTranscriptForm({ transcript: "" });
    setDetectedLanguage(null);

    voiceInputModeRef.current = "mic";
    voiceInputStartedAtMsRef.current = Date.now();
    trackEvent(AnalyticsEvents.VOICE_INPUT_STARTED, {
      mode: "mic",
      language_mode: languageMode,
      settings_language: settings.language,
      audio_sample_rate: AUDIO_SAMPLE_RATE,
    });

    setStatus("listening");

    try {
      AudioRecord.init({
        sampleRate: AUDIO_SAMPLE_RATE,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6,
        wavFile: "ai-voice.wav",
      });

      await AudioRecord.start();
      isListeningRef.current = true;
    } catch (error) {
      console.error("Failed to start audio recording", error);
      isListeningRef.current = false;
      setErrorMessage(
        error instanceof Error ? error.message : t.voice.missingRecorder,
      );
      setStatus("idle");

      trackVoiceInputFailed("record_start", error);
      voiceInputModeRef.current = null;
      voiceInputStartedAtMsRef.current = null;
    }
  };

  const processTranscript = async (transcript: string) => {
    if (!transcript) {
      setErrorMessage(t.voice.noSpeechDetected);
      setStatus("idle");
      trackVoiceInputFailed("empty_transcript");
      return;
    }

    const detected = resolveLanguageCode(detectedLanguage);
    const parsingLanguage =
      languageMode === "auto"
        ? detected || settings.language
        : languageMode;

    const parsed = await parseVoiceInput(transcript, {
      currencyCode: settings.currency.code,
      language: parsingLanguage,
    });

    if (!parsed) {
      setErrorMessage(t.voice.parseFailed);
      setStatus("idle");
      trackVoiceInputFailed("parse_no_result");
      return;
    }

    const enriched = await autoAssignCategories(parsed);
    setParsedResult(enriched);
    setStatus("review");

    const durationMs = getVoiceInputDurationMs();
    const wordCount = transcript
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0).length;

    trackEvent(AnalyticsEvents.VOICE_INPUT_COMPLETED, {
      mode: voiceInputModeRef.current ?? "unknown",
      expense_count: enriched.expenses.length,
      grocery_count: enriched.groceries.length,
      transcript_char_count: transcript.length,
      transcript_word_count: wordCount,
      language_mode: languageMode,
      settings_language: settings.language,
      detected_language: resolveLanguageCode(detectedLanguage),
      ...(durationMs !== undefined ? { duration_ms: durationMs } : {}),
    });
  };

  const stopListening = async () => {
    if (!isListeningRef.current) return;
    isListeningRef.current = false;
    setStatus("processing");

    try {
      const audioFileUri = await AudioRecord.stop();
      if (!audioFileUri) {
        setErrorMessage(t.voice.noSpeechDetected);
        setStatus("idle");
        trackVoiceInputFailed("record_stop_no_file");
        return;
      }

      const apiKey = getElevenLabsApiKey();
      const result = await transcribeAudioFile({
        fileUri: audioFileUri,
        apiKey,
        languageCode: languageMode === "auto" ? undefined : languageMode,
      });

      setDetectedLanguage(result.language || null);
      const normalized = normalizeSpeechText(result.text || "");
      setTranscriptValue("transcript", normalized);
      await processTranscript(normalized);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to transcribe audio";
      setErrorMessage(message);
      setStatus("idle");

      trackVoiceInputFailed("mic_transcribe_or_parse", error);
    }
  };

  const sendTypedTranscript = handleTranscriptSubmit(async ({ transcript }) => {
    const normalized = normalizeSpeechText(transcript);
    if (!normalized) {
      setErrorMessage(t.voice.noSpeechDetected);
      voiceInputModeRef.current = "typed";
      voiceInputStartedAtMsRef.current = Date.now();
      trackVoiceInputFailed("typed_empty_transcript");
      voiceInputModeRef.current = null;
      voiceInputStartedAtMsRef.current = null;
      return;
    }

    setErrorMessage(null);
    setParsedResult(null);
    setStatus("processing");

    voiceInputModeRef.current = "typed";
    voiceInputStartedAtMsRef.current = Date.now();
    const typedWordCount = normalized
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0).length;
    trackEvent(AnalyticsEvents.VOICE_INPUT_STARTED, {
      mode: "typed",
      transcript_char_count: normalized.length,
      transcript_word_count: typedWordCount,
      language_mode: languageMode,
      settings_language: settings.language,
    });

    try {
      await processTranscript(normalized);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : t.voice.parseFailed;
      setErrorMessage(message);
      setParsedResult(null);
      setStatus("idle");

      trackVoiceInputFailed("typed_parse", error);
    }
  });

  const toggleMicrophone = () => {
    if (status === "processing") {
      return;
    }

    if (status === "listening") {
      void stopListening();
      return;
    }

    void startListening();
  };

  const handleConfirm = () => {
    if (!parsedResult) return;

    parsedResult.expenses.forEach((expense) => {
      addExpense({
        amount: expense.amount,
        category: expense.category || "other",
        date: new Date(),
        description: expense.description,
        currency: settings.currency.code,
        aiDetected: true,
      });
    });

    parsedResult.groceries.forEach((item) => {
      const parsedPrice =
        typeof item.price === "number" && Number.isFinite(item.price) && item.price > 0
          ? item.price
          : null;

      addGroceryItem({
        name: item.name,
        quantity: item.quantity || "",
        price: parsedPrice,
        category: item.category || "other",
        checked: false,
        aiDetected: true,
      });
    });

    showToast(t.voice.itemsAdded);
    resetState();
    onClose();
  };

  const updateExpense = (index: number, item: VoiceParsedExpense) => {
    setParsedResult((prev) => {
      if (!prev) return prev;
      const updated = [...prev.expenses];
      updated[index] = item;
      return { ...prev, expenses: updated };
    });
  };

  const updateGrocery = (index: number, item: VoiceParsedGrocery) => {
    setParsedResult((prev) => {
      if (!prev) return prev;
      const updated = [...prev.groceries];
      updated[index] = item;
      return { ...prev, groceries: updated };
    });
  };

  const languageLabel = useMemo(() => {
    if (!detectedLanguage) return "";
    const normalized = detectedLanguage.toLowerCase();
    if (normalized.startsWith("bn")) return t.voice.languageBangla;
    if (normalized.startsWith("en")) return t.voice.languageEnglish;
    return normalized.toUpperCase();
  }, [detectedLanguage, t]);

  const statusLabel =
    status === "listening"
      ? t.voice.listening
      : status === "processing"
        ? t.voice.processing
        : status === "review"
          ? t.voice.review
          : t.voice.ready;

  const detectedLanguageLabel = languageLabel
    ? `${t.voice.detectedLanguage}: ${languageLabel}`
    : "";

  const languageOptions = useMemo(
    () =>
      [
        { value: "auto", label: t.voice.languageAuto },
        { value: "bn", label: t.voice.languageBangla },
        { value: "en", label: t.voice.languageEnglish },
      ] as const,
    [t],
  );

  const closeButtonLabel = t.common.close || t.form.cancel || "Close";

  if (!shouldRender) return null;

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, backdropStyle]}>
        <Animated.View
          style={[
            styles.modalContent,
            { backgroundColor: colors.surface },
            animatedStyle,
          ]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.outline }]}
          >
            <View style={styles.modalTitleContainer}>
              <Text style={[styles.modalTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {t.voice.title}
              </Text>
              <Text
                style={[
                  styles.modalSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {t.voice.subtitle}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={closeButtonLabel}
              style={styles.closeButton}
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                size={22}
                color={colors.text}
                strokeWidth={2}
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            {errorMessage && (
              <View style={[styles.errorBanner, { borderColor: colors.error }]}
              >
                <Text style={[styles.errorText, { color: colors.error }]}
                  numberOfLines={3}
                >
                  {errorMessage}
                </Text>
              </View>
            )}

            <VoiceStatusIndicator
              status={status}
              statusLabel={statusLabel}
              detectedLanguageLabel={detectedLanguageLabel}
              readyPulseStyle={readyPulseStyle}
              colors={colors}
            />

            <VoiceLanguageSelector
              label={t.voice.language}
              options={languageOptions}
              value={languageMode}
              onChange={setLanguageMode}
              colors={colors}
            />

            <VoiceTranscriptInput
              status={status}
              transcriptControl={transcriptControl}
              canSendText={canSendText}
              hasError={!!errorMessage}
              onClearError={() => setErrorMessage(null)}
              onSendText={() => {
                void sendTypedTranscript();
              }}
              onToggleMicrophone={toggleMicrophone}
              labels={{
                listening: t.voice.listening,
                processing: t.voice.processing,
                transcriptPlaceholder: t.voice.transcriptPlaceholder,
                sendText: t.voice.sendText,
                startListening: t.voice.startListening,
                stopListening: t.voice.stopListening,
              }}
              colors={colors}
              recordingDotStyle={recordingDotStyle}
              waveBarOneStyle={waveBarOneStyle}
              waveBarTwoStyle={waveBarTwoStyle}
              waveBarThreeStyle={waveBarThreeStyle}
              micIconContainerStyle={micIconContainerStyle}
              micIconStyle={micIconStyle}
              closeIconStyle={closeIconStyle}
            />

            {status === "processing" && (
              <View style={styles.processingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.processingText, { color: colors.text }]}
                >
                  {t.voice.processing}
                </Text>
              </View>
            )}

            {status === "review" && parsedResult && (
              <VoiceReviewSection
                parsedResult={parsedResult}
                settings={settings}
                t={t}
                formatNumber={formatNumber}
                colors={colors}
                onEditExpense={(index, item) => setEditingExpense({ index, item })}
                onEditGrocery={(index, item) => setEditingGrocery({ index, item })}
                onTryAgain={() => {
                  resetState();
                  void startListening();
                }}
                onConfirm={handleConfirm}
              />
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>

      <EditExpenseModal
        visible={!!editingExpense}
        item={editingExpense?.item || null}
        onClose={() => setEditingExpense(null)}
        onSave={(item) => {
          if (!editingExpense) return;
          updateExpense(editingExpense.index, item);
          setEditingExpense(null);
        }}
      />

      <EditGroceryModal
        visible={!!editingGrocery}
        item={editingGrocery?.item || null}
        onClose={() => setEditingGrocery(null)}
        onSave={(item) => {
          if (!editingGrocery) return;
          updateGrocery(editingGrocery.index, item);
          setEditingGrocery(null);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 4,
    maxWidth: 240,
    lineHeight: 18,
  },
  content: {
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
  },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  processingText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
