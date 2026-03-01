import { AudioModule, RecordingPresets, setAudioModeAsync } from "expo-audio";
import type { AudioRecorder as ExpoAudioRecorder, RecordingOptions } from "expo-audio";

type AudioRecordEvent = "data";

export interface AudioRecordOptions {
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  wavFile?: string;
}

type RecorderConstructor = new (options: RecordingOptions) => ExpoAudioRecorder;

interface RecorderStateSnapshot {
  url?: string | null;
  durationMillis?: number;
}

const logAudioRecordDebug = (stage: string, details?: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.log(`[AudioRecord] ${stage}`, details || {});
};

const getRecorderConstructor = (): RecorderConstructor | null => {
  const moduleWithRecorder = AudioModule as unknown as {
    AudioRecorder?: RecorderConstructor;
  };
  return moduleWithRecorder.AudioRecorder ?? null;
};

let recorder: ExpoAudioRecorder | null = null;
let recordingOptions: RecordingOptions = RecordingPresets.HIGH_QUALITY;
let startPromise: Promise<void> | null = null;
let lastPreparedRecordingUrl: string | null = null;

const cleanUri = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getRecorderStatusSafe = (target: ExpoAudioRecorder): RecorderStateSnapshot | null => {
  try {
    const status = target.getStatus() as RecorderStateSnapshot;
    return status;
  } catch (error) {
    logAudioRecordDebug("get_status_failed", {
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
            }
          : String(error),
    });
    return null;
  }
};

const resolveRecordingOptions = (options?: AudioRecordOptions) => {
  const base = RecordingPresets.HIGH_QUALITY;
  const extensionMatch = options?.wavFile?.match(/\.[^/.]+$/);
  const requestedExtension = extensionMatch?.[0]?.toLowerCase();
  const extension =
    requestedExtension && [".m4a", ".3gp", ".webm", ".wav"].includes(requestedExtension)
      ? requestedExtension
      : base.extension;
  const sampleRate = options?.sampleRate ?? base.sampleRate;
  const numberOfChannels = options?.channels ?? base.numberOfChannels;

  return {
    ...base,
    extension,
    sampleRate,
    numberOfChannels,
    android: {
      ...base.android,
      sampleRate,
      extension,
    },
    ios: {
      ...base.ios,
      sampleRate,
      extension,
      linearPCMBitDepth: options?.bitsPerSample ?? base.ios.linearPCMBitDepth,
    },
    web: {
      ...base.web,
    },
  };
};

export const AudioRecord = {
  isAvailable: async () => {
    const recorderConstructor = getRecorderConstructor();
    if (!recorderConstructor) return false;

    const permissionResult = await AudioModule.requestRecordingPermissionsAsync();
    return permissionResult?.granted === true;
  },
  init: (options: AudioRecordOptions) => {
    const recorderConstructor = getRecorderConstructor();
    if (!recorderConstructor) {
      throw new Error("Audio recorder unavailable");
    }

    recordingOptions = resolveRecordingOptions(options);
    recorder = new recorderConstructor(recordingOptions);
    lastPreparedRecordingUrl = null;

    logAudioRecordDebug("init", {
      extension: recordingOptions.extension,
      sampleRate: recordingOptions.sampleRate,
      numberOfChannels: recordingOptions.numberOfChannels,
    });
  },
  start: async () => {
    const recorderConstructor = getRecorderConstructor();
    if (!recorderConstructor) {
      throw new Error("Audio recorder unavailable");
    }

    if (recorder?.isRecording) {
      logAudioRecordDebug("start_skipped_already_recording");
      return;
    }

    if (startPromise) {
      await startPromise;
      return;
    }

    startPromise = (async () => {
      logAudioRecordDebug("start_requested", {
        hasRecorder: !!recorder,
      });

      const permissionResult = await AudioModule.requestRecordingPermissionsAsync();
      if (!permissionResult?.granted) {
        logAudioRecordDebug("start_permission_denied");
        throw new Error("Microphone permission denied");
      }

      if (!recorder) {
        recorder = new recorderConstructor(recordingOptions);
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(recordingOptions);

      const statusAfterPrepare = getRecorderStatusSafe(recorder);
      lastPreparedRecordingUrl = cleanUri(statusAfterPrepare?.url);

      recorder.record();

      logAudioRecordDebug("start_success", {
        extension: recordingOptions.extension,
        preparedUrl: lastPreparedRecordingUrl,
      });
    })();

    try {
      await startPromise;
    } catch (error) {
      recorder = null;
      logAudioRecordDebug("start_failed", {
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
              }
            : String(error),
      });
      throw error;
    } finally {
      startPromise = null;
    }
  },
  stop: async (): Promise<string | null> => {
    if (!recorder) {
      throw new Error("No recording in progress");
    }

    logAudioRecordDebug("stop_requested");

    await recorder.stop();

    const statusAfterStop = getRecorderStatusSafe(recorder);
    const directUri = cleanUri(recorder.uri);
    const statusUri = cleanUri(statusAfterStop?.url);
    const resolvedUri = directUri ?? statusUri ?? lastPreparedRecordingUrl;

    const statusDurationMillis =
      typeof statusAfterStop?.durationMillis === "number" ? statusAfterStop.durationMillis : null;

    recorder = null;
    lastPreparedRecordingUrl = null;

    logAudioRecordDebug("stop_success", {
      hasUri: !!resolvedUri,
      uri: resolvedUri,
      directUri,
      statusUri,
      statusDurationMillis,
    });

    return resolvedUri;
  },
  on: (event: AudioRecordEvent, handler: (data: string) => void) => null,
  removeAllListeners: (event: AudioRecordEvent) => undefined,
};
