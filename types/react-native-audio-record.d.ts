declare module "react-native-audio-record" {
  export interface AudioRecordOptions {
    sampleRate?: number;
    channels?: number;
    bitsPerSample?: number;
    audioSource?: number;
    wavFile?: string;
    bufferSize?: number;
  }

  export interface AudioRecordModule {
    init: (options: AudioRecordOptions) => void;
    start: () => void;
    stop: () => Promise<string>;
    on: (event: "data", handler: (data: string) => void) => void;
    off?: (event: "data", handler?: (data: string) => void) => void;
  }

  const AudioRecord: AudioRecordModule;
  export default AudioRecord;
}
