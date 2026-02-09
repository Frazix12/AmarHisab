import { BanglaNumberInput } from "@/components/shared/bangla-number-input";
import { HapticPressable as Pressable } from "@/components/ui/haptic-pressable";
import { showToast } from "@/components/ui/toast";
import { Colors } from "@/constants/theme";
import { useApp } from "@/contexts/app-context";
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
import {
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  GROCERY_CATEGORIES,
  GroceryCategory,
} from "@/types";
import { parseBanglaNumber } from "@/utils/format";
import { useModalAnimation } from "@/utils/animations";
import { triggerLightHaptic } from "@/utils/haptics";
import {
  Cancel01Icon,
  AiMicIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
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
  const { addExpense, addGroceryItem, settings, colorScheme, t, formatNumber } =
    useApp();
  const colors = Colors[colorScheme];
  const { animatedStyle, backdropStyle, shouldRender } = useModalAnimation(visible);

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
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
  const readyPulse = useSharedValue(1);
  const readyOpacity = useSharedValue(0.55);
  const recordingDotScale = useSharedValue(1);
  const recordingDotOpacity = useSharedValue(0.6);
  const waveBarOne = useSharedValue(0.35);
  const waveBarTwo = useSharedValue(0.35);
  const waveBarThree = useSharedValue(0.35);

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

  const displayTranscript = useMemo(() => {
    if (!transcript) return "";
    return normalizeSpeechText(transcript);
  }, [transcript]);

  const resetState = () => {
    setStatus("idle");
    setTranscript("");
    setParsedResult(null);
    setErrorMessage(null);
    setDetectedLanguage(null);
  };

  const cleanupSession = async () => {
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
  };

  useEffect(() => {
    if (!visible) {
      cleanupSession();
      resetState();
    }
  }, [visible]);

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
      return;
    }

    const apiKey = getElevenLabsApiKey();
    if (!apiKey) {
      setErrorMessage(t.voice.missingApiKey);
      return;
    }

    if (!isAudioRecordAvailable()) {
      setErrorMessage(t.voice.missingRecorder);
      return;
    }

    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      setErrorMessage(t.voice.micPermission);
      return;
    }

    setErrorMessage(null);
    setParsedResult(null);
    setTranscript("");
    setDetectedLanguage(null);
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
    }
  };

  const processTranscript = async (transcript: string) => {
    if (!transcript) {
      setErrorMessage(t.voice.noSpeechDetected);
      setStatus("idle");
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
      return;
    }

    const enriched = await autoAssignCategories(parsed);
    setParsedResult(enriched);
    setStatus("review");
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
        return;
      }

      const apiKey = getElevenLabsApiKey();
      if (!apiKey || !apiKey.trim()) {
        setErrorMessage(t.voice.missingApiKey);
        setStatus("idle");
        return;
      }

      const result = await transcribeAudioFile({
        fileUri: audioFileUri,
        apiKey,
        languageCode: languageMode === "auto" ? undefined : languageMode,
      });

      setDetectedLanguage(result.language || null);
      const normalized = normalizeSpeechText(result.text || "");
      setTranscript(normalized);
      await processTranscript(normalized);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to transcribe audio";
      setErrorMessage(message);
      setStatus("idle");
    }
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
      addGroceryItem({
        name: item.name,
        quantity: item.quantity || "",
        price: item.price ?? null,
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
            <Pressable onPress={onClose} style={styles.closeButton}>
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

            <View style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        status === "listening"
                          ? colors.primary + "20"
                          : colors.surfaceVariant,
                      borderColor: colors.outline,
                    },
                  ]}
                >
                  {status === "idle" ? (
                    <Animated.View
                      style={[
                        styles.readyIndicator,
                        readyPulseStyle,
                        {
                          backgroundColor: colors.success,
                          shadowColor: colors.success,
                        },
                      ]}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                  ) : null}
                  <Text
                    style={[styles.statusText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {status === "listening"
                      ? t.voice.listening
                      : status === "processing"
                        ? t.voice.processing
                        : status === "review"
                          ? t.voice.review
                          : t.voice.ready}
                  </Text>
                </View>
              </View>
              {languageLabel ? (
                <Text style={[styles.languageText, { color: colors.textSecondary }]}
                >
                  {t.voice.detectedLanguage}: {languageLabel}
                </Text>
              ) : null}
            </View>

            <View style={styles.languageSelector}>
              <Text style={[styles.selectorLabel, { color: colors.text }]}
              >
                {t.voice.language}
              </Text>
              <View style={styles.selectorRow}>
                {(
                  [
                    { value: "auto", label: t.voice.languageAuto },
                    { value: "bn", label: t.voice.languageBangla },
                    { value: "en", label: t.voice.languageEnglish },
                  ] as const
                ).map((option) => {
                  const isActive = languageMode === option.value;
                  return (
                    <Pressable
                      haptic="medium"
                      key={option.value}
                      onPress={() => setLanguageMode(option.value)}
                      style={[
                        styles.selectorOption,
                        {
                          backgroundColor: isActive
                            ? colors.primaryContainer
                            : colors.surfaceVariant,
                          borderColor: isActive
                            ? colors.primary
                            : colors.outline,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectorOptionText,
                          { color: isActive ? colors.primary : colors.text },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View
              style={[
                styles.transcriptCard,
                { backgroundColor: colors.surfaceVariant, borderColor: colors.outline },
              ]}
            >
              <Text style={[styles.transcriptLabel, { color: colors.text }]}
              >
                {t.voice.transcript}
              </Text>
              <Text
                style={[styles.transcriptText, { color: colors.textSecondary }]}
              >
                {displayTranscript ||
                  (status === "listening"
                    ? t.voice.listening
                    : status === "processing"
                      ? t.voice.processing
                      : "...")}
              </Text>

              {status === "listening" ? (
                <View
                  style={[
                    styles.recordingIndicator,
                    {
                      backgroundColor: colors.primary + "14",
                      borderColor: colors.primary + "40",
                    },
                  ]}
                >
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
                  <Text
                    style={[styles.recordingText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {t.voice.listening}
                  </Text>
                  <View style={styles.recordingWave}>
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
              ) : null}
            </View>

            {status === "idle" && (
              <Pressable
                onPress={startListening}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                ]}
              >
                <HugeiconsIcon
                  icon={AiMicIcon}
                  size={20}
                  color={colors.onPrimary}
                  strokeWidth={2.2}
                />
                <Text
                  style={[styles.primaryButtonText, { color: colors.onPrimary }]}
                >
                  {t.voice.startListening}
                </Text>
              </Pressable>
            )}

            {status === "listening" && (
              <Pressable
                onPress={stopListening}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[styles.primaryButtonText, { color: colors.onPrimary }]}
                >
                  {t.voice.stopListening}
                </Text>
              </Pressable>
            )}

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
              <View>
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewTitle, { color: colors.text }]}
                  >
                    {t.voice.review}
                  </Text>
                  <Text
                    style={[
                      styles.reviewHint,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.voice.reviewHint}
                  </Text>
                </View>

                <View style={styles.reviewSection}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.text }]}
                  >
                    {t.voice.expenses}
                  </Text>
                  {parsedResult.expenses.length === 0 ? (
                    <Text
                      style={[
                        styles.emptyText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.voice.emptyExpenses}
                    </Text>
                  ) : (
                    parsedResult.expenses.map((expense, index) => (
                      <Pressable
                        key={`expense-${index}`}
                        onPress={() =>
                          setEditingExpense({ index, item: expense })
                        }
                        style={[
                          styles.reviewCard,
                          {
                            backgroundColor: colors.surfaceVariant,
                            borderColor: colors.outline,
                          },
                        ]}
                      >
                        <View style={styles.reviewRow}>
                          <Text
                            style={[styles.reviewMain, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {expense.description}
                          </Text>
                          <Text
                            style={[
                              styles.reviewAmount,
                              { color: colors.text },
                            ]}
                          >
                            {settings.currency.symbol}
                            {formatNumber(expense.amount)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.reviewMeta,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t.categories[
                            (expense.category || "other") as keyof typeof t.categories
                          ]}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>

                <View style={styles.reviewSection}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.text }]}
                  >
                    {t.voice.groceries}
                  </Text>
                  {parsedResult.groceries.length === 0 ? (
                    <Text
                      style={[
                        styles.emptyText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.voice.emptyGroceries}
                    </Text>
                  ) : (
                    parsedResult.groceries.map((item, index) => (
                      <Pressable
                        key={`grocery-${index}`}
                        onPress={() => setEditingGrocery({ index, item })}
                        style={[
                          styles.reviewCard,
                          {
                            backgroundColor: colors.surfaceVariant,
                            borderColor: colors.outline,
                          },
                        ]}
                      >
                        <View style={styles.reviewRow}>
                          <Text
                            style={[styles.reviewMain, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text
                            style={[
                              styles.reviewAmount,
                              { color: colors.text },
                            ]}
                          >
                            {item.price !== undefined
                              ? `${settings.currency.symbol}${formatNumber(item.price)}`
                              : "-"}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.reviewMeta,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {(item.quantity ? `${item.quantity} • ` : "") +
                            t.categories[
                              (item.category || "other") as keyof typeof t.categories
                            ]}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>

                <View style={styles.reviewActions}>
                  <Pressable
                    onPress={() => {
                      resetState();
                      startListening();
                    }}
                    style={[
                      styles.secondaryButton,
                      { borderColor: colors.outline },
                    ]}
                  >
                    <Text
                      style={[styles.secondaryButtonText, { color: colors.text }]}
                    >
                      {t.voice.tryAgain}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirm}
                    style={[
                      styles.primaryButton,
                      { backgroundColor: colors.primary, flex: 1, marginTop: 0 },
                    ]}
                  >
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      size={20}
                      color={colors.onPrimary}
                      strokeWidth={2.2}
                    />
                    <Text
                      style={[
                        styles.primaryButtonText,
                        { color: colors.onPrimary },
                      ]}
                    >
                      {t.voice.confirmAdd}
                    </Text>
                  </Pressable>
                </View>
              </View>
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

interface EditExpenseModalProps {
  visible: boolean;
  item: VoiceParsedExpense | null;
  onClose: () => void;
  onSave: (item: VoiceParsedExpense) => void;
}

const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  visible,
  item,
  onClose,
  onSave,
}) => {
  const { colorScheme, t, settings } = useApp();
  const colors = Colors[colorScheme];
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [amountError, setAmountError] = useState<string | null>(null);

  const parsedAmount = Number.parseFloat(amount);
  const isAmountValid = !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const isSaveDisabled = !isAmountValid;
  const validationError =
    !isAmountValid && amount.trim() ? t.alerts.invalidAmount : null;
  const displayAmountError = amountError ?? validationError;

  useEffect(() => {
    if (!visible || !item) return;
    setAmount(item.amount.toString());
    setDescription(item.description);
    setCategory(item.category || "other");
    setAmountError(null);
  }, [visible, item]);

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.editOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.editContainer}
        >
          <View
            style={[styles.editCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.editHeader}>
              <Text style={[styles.editTitle, { color: colors.text }]}
              >
                {t.expenses.editExpense}
              </Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={20}
                  color={colors.text}
                  strokeWidth={2}
                />
              </Pressable>
            </View>

            <View style={styles.editBody}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}
              >
                {t.form.amount} ({settings.currency.symbol})
              </Text>
              <BanglaNumberInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.outline,
                    color: colors.text,
                  },
                ]}
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  if (amountError) setAmountError(null);
                }}
                isBanglaMode={settings.language === "bn"}
              />
              {displayAmountError ? (
                <Text style={[styles.inputErrorText, { color: colors.error }]}>
                  {displayAmountError}
                </Text>
              ) : null}

              <Text style={[styles.fieldLabel, { color: colors.text }]}
              >
                {t.form.description}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.outline,
                    color: colors.text,
                  },
                ]}
                value={description}
                onChangeText={setDescription}
                onFocus={() => triggerLightHaptic()}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}
              >
                {t.form.category}
              </Text>
              <View style={styles.categoryGrid}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor:
                          category === cat.value
                            ? colors.primaryContainer
                            : colors.surfaceVariant,
                        borderColor:
                          category === cat.value
                            ? colors.primary
                            : colors.outline,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color:
                            category === cat.value
                              ? colors.primary
                              : colors.text,
                        },
                      ]}
                    >
                      {t.categories[cat.value as keyof typeof t.categories]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.editActions}>
              <Pressable
                onPress={onClose}
                style={[
                  styles.secondaryButton,
                  { borderColor: colors.outline },
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  {t.form.cancel}
                </Text>
              </Pressable>
              <Pressable
                disabled={isSaveDisabled}
                onPress={() => {
                  if (!isAmountValid) {
                    setAmountError(t.alerts.invalidAmount);
                    return;
                  }
                  setAmountError(null);
                  onSave({
                    amount: parsedAmount,
                    description: description.trim() || item.description,
                    category,
                  });
                }}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    flex: 1,
                    marginTop: 0,
                    opacity: isSaveDisabled ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={[styles.primaryButtonText, { color: colors.onPrimary }]}
                >
                  {t.form.save}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

interface EditGroceryModalProps {
  visible: boolean;
  item: VoiceParsedGrocery | null;
  onClose: () => void;
  onSave: (item: VoiceParsedGrocery) => void;
}

const EditGroceryModal: React.FC<EditGroceryModalProps> = ({
  visible,
  item,
  onClose,
  onSave,
}) => {
  const { colorScheme, t, settings } = useApp();
  const colors = Colors[colorScheme];
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<GroceryCategory>("other");
  const [nameError, setNameError] = useState<string | null>(null);

  const isNameValid = name.trim().length > 0;

  useEffect(() => {
    if (!visible || !item) return;
    setName(item.name);
    setQuantity(item.quantity || "");
    setPrice(item.price?.toString() || "");
    setCategory(item.category || "other");
    setNameError(null);
  }, [visible, item]);

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.editOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.editContainer}
        >
          <View
            style={[styles.editCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.editHeader}>
              <Text style={[styles.editTitle, { color: colors.text }]}
              >
                {t.grocery.editItem}
              </Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={20}
                  color={colors.text}
                  strokeWidth={2}
                />
              </Pressable>
            </View>

            <View style={styles.editBody}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}
              >
                {t.form.name}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.outline,
                    color: colors.text,
                  },
                ]}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError && text.trim()) setNameError(null);
                }}
                onFocus={() => triggerLightHaptic()}
              />
              {nameError ? (
                <Text style={[styles.inputErrorText, { color: colors.error }]}>
                  {nameError}
                </Text>
              ) : null}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}
                  >
                    {t.form.quantity}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceVariant,
                        borderColor: colors.outline,
                        color: colors.text,
                      },
                    ]}
                    value={quantity}
                    onChangeText={(text) =>
                      setQuantity(parseBanglaNumber(text))
                    }
                    onFocus={() => triggerLightHaptic()}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}
                  >
                    {t.form.price} ({settings.currency.symbol})
                  </Text>
                  <BanglaNumberInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceVariant,
                        borderColor: colors.outline,
                        color: colors.text,
                      },
                    ]}
                    value={price}
                    onChangeText={setPrice}
                    isBanglaMode={settings.language === "bn"}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}
              >
                {t.form.category}
              </Text>
              <View style={styles.categoryGrid}>
                {GROCERY_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor:
                          category === cat.value
                            ? colors.primaryContainer
                            : colors.surfaceVariant,
                        borderColor:
                          category === cat.value
                            ? colors.primary
                            : colors.outline,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color:
                            category === cat.value
                              ? colors.primary
                              : colors.text,
                        },
                      ]}
                    >
                      {t.categories[cat.value as keyof typeof t.categories]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.editActions}>
              <Pressable
                onPress={onClose}
                style={[
                  styles.secondaryButton,
                  { borderColor: colors.outline },
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  {t.form.cancel}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!isNameValid) {
                    setNameError(t.alerts.requiredName);
                    return;
                  }
                  setNameError(null);
                  const parsedPrice = price.trim()
                    ? Number.parseFloat(price)
                    : undefined;
                  const priceValue =
                    parsedPrice !== undefined && !Number.isNaN(parsedPrice)
                      ? parsedPrice
                      : undefined;
                  onSave({
                    name: name.trim(),
                    quantity: quantity.trim() || undefined,
                    price: priceValue,
                    category,
                  });
                }}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary, flex: 1, marginTop: 0 },
                ]}
              >
                <Text
                  style={[styles.primaryButtonText, { color: colors.onPrimary }]}
                >
                  {t.form.save}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    flexWrap: "wrap",
    rowGap: 8,
    columnGap: 8,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  readyIndicator: {
    width: 10,
    height: 10,
    borderRadius: 999,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    flexShrink: 1,
  },
  languageText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    flexShrink: 1,
    textAlign: "right",
    minWidth: 0,
  },
  languageSelector: {
    marginTop: 16,
    gap: 8,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  selectorRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    rowGap: 8,
  },
  selectorOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  selectorOptionText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  transcriptCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 15,
    lineHeight: 22,
  },
  recordingIndicator: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
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
  recordingWave: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 22,
  },
  recordingWaveBar: {
    width: 4,
    borderRadius: 4,
    minHeight: 7,
  },
  primaryButton: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
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
  reviewHeader: {
    marginTop: 20,
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  reviewHint: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  reviewSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 18,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  reviewMain: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
  },
  reviewAmount: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  reviewMeta: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  reviewActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  editOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  editContainer: {
    width: "100%",
  },
  editCard: {
    borderRadius: 16,
    padding: 18,
  },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  editTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  editBody: {
    gap: 12,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    lineHeight: 20,
  },
  inputErrorText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
    fontWeight: "600",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
});
