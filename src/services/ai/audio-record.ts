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

const getRecorderConstructor = (): RecorderConstructor | null => {
  const moduleWithRecorder = AudioModule as unknown as {
    AudioRecorder?: RecorderConstructor;
  };
  return moduleWithRecorder.AudioRecorder ?? null;
};

let recorder: ExpoAudioRecorder | null = null;
let recordingOptions: RecordingOptions = RecordingPresets.HIGH_QUALITY;
let startPromise: Promise<void> | null = null;

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
  },
  start: async () => {
    const recorderConstructor = getRecorderConstructor();
    if (!recorderConstructor) {
      throw new Error("Audio recorder unavailable");
    }
    if (recorder) {
      return;
    }
    if (startPromise) {
      await startPromise;
      return;
    }

    startPromise = (async () => {
      const permissionResult = await AudioModule.requestRecordingPermissionsAsync();
      if (!permissionResult?.granted) {
        throw new Error("Microphone permission denied");
      }

      if (!recorder) {
        recorder = new recorderConstructor(recordingOptions);
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(recordingOptions);
      recorder.record();
    })();

    try {
      await startPromise;
    } catch (error) {
      recorder = null;
      throw error;
    } finally {
      startPromise = null;
    }
  },
  stop: async (): Promise<string | null> => {
    if (!recorder) {
      throw new Error("No recording in progress");
    }
    await recorder.stop();
    const uri = recorder.uri;
    recorder = null;
    return uri ?? null;
  },
  on: (event: AudioRecordEvent, handler: (data: string) => void) => null,
  removeAllListeners: (event: AudioRecordEvent) => undefined,
};
