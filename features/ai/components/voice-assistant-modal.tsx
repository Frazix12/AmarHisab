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
import {
  Cancel01Icon,
  Mic01Icon,
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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

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

const buildLanguageLabel = (languageCode: string | null) => {
  if (!languageCode) return "";
  const normalized = languageCode.toLowerCase();
  if (normalized.startsWith("bn")) return "Bangla";
  if (normalized.startsWith("en")) return "English";
  return normalized.toUpperCase();
};

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
  const { animatedStyle, backdropStyle } = useModalAnimation(visible);

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
        const detected = await detectExpenseCategory(item.description);
        return {
          ...item,
          category: (detected as ExpenseCategory) || "other",
        };
      }),
    );

    const groceries = await Promise.all(
      result.groceries.map(async (item) => {
        if (item.category) return item;
        const detected = await detectItemCategory(item.name);
        return {
          ...item,
          category: detected || "other",
        };
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

    AudioRecord.init({
      sampleRate: AUDIO_SAMPLE_RATE,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      wavFile: "ai-voice.wav",
    });

    isListeningRef.current = true;
    AudioRecord.start();
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

      const result = await transcribeAudioFile({
        fileUri: audioFileUri,
        apiKey: getElevenLabsApiKey(),
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
        price: item.price ?? 0,
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

  const languageLabel = buildLanguageLabel(detectedLanguage);

  return (
    <Modal
      visible={visible}
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
          <View style={styles.modalHeader}>
            <View>
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
            <Pressable onPress={onClose}>
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
                  icon={Mic01Icon}
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
                      { backgroundColor: colors.primary, flex: 1 },
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
  const { colorScheme, t, settings, formatNumber } = useApp();
  const colors = Colors[colorScheme];
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");

  useEffect(() => {
    if (!visible || !item) return;
    setAmount(item.amount.toString());
    setDescription(item.description);
    setCategory(item.category || "other");
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
              <Pressable onPress={onClose}>
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
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.outline,
                    color: colors.text,
                  },
                ]}
                value={formatNumber(amount)}
                onChangeText={(text) => setAmount(parseBanglaNumber(text))}
                keyboardType="decimal-pad"
              />

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
                onPress={() => {
                  const parsed = Number.parseFloat(amount);
                  if (Number.isNaN(parsed) || parsed <= 0) return;
                  onSave({
                    amount: parsed,
                    description: description.trim() || item.description,
                    category,
                  });
                }}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary, flex: 1 },
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
  const { colorScheme, t, settings, formatNumber } = useApp();
  const colors = Colors[colorScheme];
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<GroceryCategory>("other");

  useEffect(() => {
    if (!visible || !item) return;
    setName(item.name);
    setQuantity(item.quantity || "");
    setPrice(item.price?.toString() || "");
    setCategory(item.category || "other");
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
              <Pressable onPress={onClose}>
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
                onChangeText={setName}
              />

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
                    value={formatNumber(quantity)}
                    onChangeText={(text) =>
                      setQuantity(parseBanglaNumber(text))
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}
                  >
                    {t.form.price} ({settings.currency.symbol})
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
                    value={formatNumber(price)}
                    onChangeText={(text) => setPrice(parseBanglaNumber(text))}
                    keyboardType="decimal-pad"
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
                  if (!name.trim()) return;
                  const parsed = price.trim()
                    ? Number.parseFloat(price)
                    : undefined;
                  onSave({
                    name: name.trim(),
                    quantity: quantity.trim() || undefined,
                    price: Number.isNaN(parsed as number) ? undefined : parsed,
                    category,
                  });
                }}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary, flex: 1 },
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
    alignItems: "flex-start",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 4,
    maxWidth: 240,
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
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  languageText: {
    fontSize: 12,
    fontWeight: "500",
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
  },
  selectorOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  selectorOptionText: {
    fontSize: 12,
    fontWeight: "600",
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
  },
  reviewHeader: {
    marginTop: 20,
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  reviewHint: {
    fontSize: 12,
    marginTop: 4,
  },
  reviewSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
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
  },
  reviewAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  reviewMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 12,
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
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
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
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
});
