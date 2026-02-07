export interface ElevenLabsRealtimeConfig {
  apiKey: string;
  modelId?: string;
  audioFormat?: "pcm_16000" | "pcm_22050" | "pcm_24000" | "pcm_44100" | "pcm_48000";
  languageCode?: string;
  includeLanguageDetection?: boolean;
  commitStrategy?: "manual" | "vad";
  onPartial: (text: string) => void;
  onCommitted: (text: string) => void;
  onLanguageDetected?: (languageCode: string) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
}

export interface ElevenLabsRealtimeConnection {
  sendAudioChunk: (base64Audio: string) => void;
  commit: () => void;
  close: () => void;
}

const DEFAULT_MODEL_ID = "scribe_v2_realtime";
const DEFAULT_AUDIO_FORMAT = "pcm_16000" as const;
const BASE_URL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime";

const resolveSampleRate = (audioFormat: string) => {
  const match = audioFormat.match(/pcm_(\d+)/);
  const parsed = match ? Number.parseInt(match[1], 10) : NaN;
  return Number.isFinite(parsed) ? parsed : 16000;
};

const buildRealtimeUrl = (config: ElevenLabsRealtimeConfig) => {
  const params = new URLSearchParams();
  params.set("model_id", config.modelId ?? DEFAULT_MODEL_ID);
  params.set("audio_format", config.audioFormat ?? DEFAULT_AUDIO_FORMAT);
  if (config.languageCode) {
    params.set("language_code", config.languageCode);
  }
  params.set(
    "include_language_detection",
    config.includeLanguageDetection ? "true" : "false",
  );
  params.set("commit_strategy", config.commitStrategy ?? "vad");
  return `${BASE_URL}?${params.toString()}`;
};

const parseRealtimeMessage = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const createElevenLabsRealtimeConnection = (
  config: ElevenLabsRealtimeConfig,
): ElevenLabsRealtimeConnection => {
  const audioFormat = config.audioFormat ?? DEFAULT_AUDIO_FORMAT;
  const url = buildRealtimeUrl({ ...config, audioFormat });
  const sampleRate = resolveSampleRate(audioFormat);
  const ws = new (WebSocket as any)(url, undefined, {
    headers: {
      "xi-api-key": config.apiKey,
    },
  }) as WebSocket;

  ws.onopen = () => {};

  ws.onmessage = (event) => {
    if (typeof event.data !== "string") return;
    const message = parseRealtimeMessage(event.data);
    if (!message) return;

    const type = message.message_type || message.type;
    if (type === "partial_transcript") {
      config.onPartial(message.text || "");
      return;
    }

    if (type === "committed_transcript") {
      config.onCommitted(message.text || "");
      return;
    }

    if (type === "committed_transcript_with_timestamps") {
      config.onCommitted(message.text || "");
      if (message.language && config.onLanguageDetected) {
        config.onLanguageDetected(message.language);
      }
      return;
    }

    if (type === "session_started") {
      config.onReady?.();
      return;
    }

    if (String(type).toLowerCase().includes("error") || message.error) {
      const errorMessage =
        message.error?.message || message.message || "Realtime transcription error";
      config.onError?.(errorMessage);
    }
  };

  ws.onerror = () => {
    config.onError?.("Realtime transcription connection error");
  };

  const sendAudioChunk = (base64Audio: string) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        message_type: "input_audio_chunk",
        audio_base_64: base64Audio,
        commit: false,
        sample_rate: sampleRate,
      }),
    );
  };

  const commit = () => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        message_type: "input_audio_chunk",
        audio_base_64: "",
        commit: true,
        sample_rate: sampleRate,
      }),
    );
  };

  const close = () => {
    if (ws.readyState === WebSocket.CLOSED) return;
    ws.close();
  };

  return {
    sendAudioChunk,
    commit,
    close,
  };
};

export { getElevenLabsApiKey } from "@/services/ai/elevenlabs";
