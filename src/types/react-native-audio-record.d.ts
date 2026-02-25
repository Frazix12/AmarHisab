declare module "react-native-audio-record" {
  import type { EventSubscription } from "react-native";

  export interface AudioRecordOptions {
    sampleRate?: number;
    channels?: number;
    bitsPerSample?: number;
    audioSource?: number;
    wavFile?: string;
  }

  export interface AudioRecordModule {
    init: (options: AudioRecordOptions) => void;
    start: () => void;
    stop: () => Promise<string>;
    on: (event: "data", handler: (data: string) => void) => EventSubscription;
  }

  const AudioRecord: AudioRecordModule;
  export default AudioRecord;
}
