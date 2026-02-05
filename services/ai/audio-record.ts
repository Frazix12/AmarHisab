import { NativeEventEmitter, NativeModules } from "react-native";

type AudioRecordEvent = "data";

export interface AudioRecordOptions {
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  audioSource?: number;
  wavFile?: string;
  bufferSize?: number;
}

type AudioRecordModule = {
  init?: (options: AudioRecordOptions) => void;
  start?: () => void;
  stop?: () => Promise<string>;
  addListener?: (event: string) => void;
  removeListeners?: (count: number) => void;
};

const nativeModule = NativeModules.RNAudioRecord as AudioRecordModule | undefined;

if (nativeModule && typeof nativeModule.addListener !== "function") {
  nativeModule.addListener = () => undefined;
}

if (nativeModule && typeof nativeModule.removeListeners !== "function") {
  nativeModule.removeListeners = () => undefined;
}

let emitter: NativeEventEmitter | null = null;

const getEmitter = () => {
  if (!nativeModule) return null;
  if (!emitter) {
    emitter = new NativeEventEmitter(nativeModule as any);
  }
  return emitter;
};

export const AudioRecord = {
  isAvailable: () => Boolean(nativeModule?.init),
  init: (options: AudioRecordOptions) => nativeModule?.init?.(options),
  start: () => nativeModule?.start?.(),
  stop: () => nativeModule?.stop?.() ?? Promise.resolve(""),
  on: (event: AudioRecordEvent, handler: (data: string) => void) => {
    const activeEmitter = getEmitter();
    if (!activeEmitter) return null;
    activeEmitter.removeAllListeners(event);
    return activeEmitter.addListener(event, handler);
  },
  removeAllListeners: (event: AudioRecordEvent) => {
    getEmitter()?.removeAllListeners(event);
  },
};
