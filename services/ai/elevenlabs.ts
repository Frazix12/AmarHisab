import {
  createLlmTraceId,
  extractHttpStatusCode,
  trackLlmGeneration,
} from "@/services/analytics/llm";

export interface ElevenLabsTranscriptionResult {
  text: string;
  language?: string;
  raw?: unknown;
}

interface TranscribeAudioOptions {
  fileUri: string;
  apiKey?: string;
  languageCode?: string;
  modelId?: string;
}

const DEFAULT_MODEL_ID =
  process.env.EXPO_PUBLIC_ELEVENLABS_STT_MODEL_ID || "scribe_v2";
const ENV_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || "";
const API_URL = "https://api.elevenlabs.io/v1/speech-to-text";

let elevenLabsApiKey = ENV_API_KEY;

const getFileName = (uri: string) => {
  const normalized = uri.split("?")[0];
  const parts = normalized.split("/");
  const candidate = parts[parts.length - 1];
  return candidate || "audio.wav";
};

const normalizeFileUri = (uri: string) => {
  if (uri.startsWith("file://") || uri.startsWith("content://")) {
    return uri;
  }
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }
  if (uri.includes("://")) {
    throw new Error(`Unsupported file URI scheme: ${uri}`);
  }
  return `file://${uri}`;
};

const getMimeType = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".m4a")) return "audio/m4a";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".aac")) return "audio/aac";
  return "audio/wav";
};

const extractTranscriptText = (data: any): string => {
  if (!data) return "";
  if (typeof data.text === "string") return data.text;
  if (typeof data.transcript === "string") return data.transcript;
  if (Array.isArray(data.transcripts) && data.transcripts[0]?.text) {
    return data.transcripts[0].text;
  }
  return "";
};

const extractLanguage = (data: any): string | undefined => {
  if (!data) return undefined;
  if (typeof data.language === "string") return data.language;
  if (Array.isArray(data.transcripts) && data.transcripts[0]?.language) {
    return data.transcripts[0].language;
  }
  return undefined;
};

export const transcribeAudioFile = async (
  options: TranscribeAudioOptions,
): Promise<ElevenLabsTranscriptionResult> => {
  const traceId = createLlmTraceId("transcribe_audio");
  const startedAt = Date.now();
  const modelId = options.modelId || DEFAULT_MODEL_ID;
  const fileName = getFileName(options.fileUri);

  try {
    const apiKey = options.apiKey?.trim() || elevenLabsApiKey.trim();

    if (!apiKey) {
      throw new Error("Voice transcription is unavailable right now.");
    }

    const form = new FormData();
    const mimeType = getMimeType(fileName);

    form.append("file", {
      uri: normalizeFileUri(options.fileUri),
      name: fileName,
      type: mimeType,
    } as any);

    form.append("model_id", modelId);

    if (options.languageCode) {
      form.append("language_code", options.languageCode);
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: form,
    });

    const rawText = await response.text();
    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch (error) {
      console.error("Failed to parse ElevenLabs transcription response JSON", {
        error,
        rawText,
        status: response.status,
      });
      data = null;
    }

    if (!response.ok) {
      const message = data?.message || rawText || "Failed to transcribe audio";

      throw Object.assign(new Error(message), { status: response.status });
    }

    const transcript = extractTranscriptText(data);
    const language = extractLanguage(data);

    trackLlmGeneration({
      traceId,
      spanName: "transcribe_audio",
      model: modelId,
      provider: "elevenlabs",
      baseUrl: "https://api.elevenlabs.io",
      requestUrl: API_URL,
      inputText: fileName,
      outputText: transcript,
      latencyMs: Date.now() - startedAt,
      properties: {
        llm_feature: "voice_transcription",
        llm_language: language ?? options.languageCode ?? "",
      },
    });

    return {
      text: transcript,
      language,
      raw: data,
    };
  } catch (error) {
    trackLlmGeneration({
      traceId,
      spanName: "transcribe_audio",
      model: modelId,
      provider: "elevenlabs",
      baseUrl: "https://api.elevenlabs.io",
      requestUrl: API_URL,
      inputText: fileName,
      latencyMs: Date.now() - startedAt,
      isError: true,
      error,
      httpStatus: extractHttpStatusCode(error),
      properties: {
        llm_feature: "voice_transcription",
      },
    });

    throw error;
  }
};

export function setElevenLabsApiKey(apiKey: string): void {
  if (apiKey) {
    elevenLabsApiKey = apiKey;
    return;
  }

  elevenLabsApiKey = ENV_API_KEY;
}

export const getElevenLabsApiKey = () => elevenLabsApiKey;
