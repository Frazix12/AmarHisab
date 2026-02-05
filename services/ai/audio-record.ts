import { AudioModule, RecordingPresets, setAudioModeAsync } from "expo-audio";
import type { AudioRecorder, RecordingOptions } from "expo-audio";

type AudioRecordEvent = "data";

export interface AudioRecordOptions {
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  audioSource?: number;
  wavFile?: string;
  bufferSize?: number;
}

let recorder: AudioRecorder | null = null;
let recordingOptions: RecordingOptions = RecordingPresets.HIGH_QUALITY;

const resolveRecordingOptions = (options?: AudioRecordOptions) => {
  const base = RecordingPresets.HIGH_QUALITY;
  const extensionMatch = options?.wavFile?.match(/\.[^/.]+$/);
  const requestedExtension = extensionMatch?.[0]?.toLowerCase();
  const extension =
    requestedExtension && [".m4a", ".3gp", ".webm"].includes(requestedExtension)
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
  isAvailable: () => Boolean(AudioModule?.AudioRecorder),
  init: (options: AudioRecordOptions) => {
    recordingOptions = resolveRecordingOptions(options);
    recorder = new AudioModule.AudioRecorder(recordingOptions);
  },
  start: async () => {
    if (!AudioModule?.AudioRecorder) {
      throw new Error("Audio recorder unavailable");
    }
    if (!recorder) {
      recorder = new AudioModule.AudioRecorder(recordingOptions);
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync(recordingOptions);
    recorder.record();
  },
  stop: async (): Promise<string | null> => {
    if (!recorder) {
      throw new Error("Audio recorder unavailable");
    }
    await recorder.stop();
    const uri = recorder.uri;
    recorder = null;
    return uri ?? null;
  },
  on: (event: AudioRecordEvent, handler: (data: string) => void) => null,
  removeAllListeners: (event: AudioRecordEvent) => undefined,
};
