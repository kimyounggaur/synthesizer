export type SynthWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'pulse' | 'wavetable';
export type NoiseKind = 'white' | 'pink';
export type FilterKind = 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'ladder';
export type LfoTarget = 'pitch' | 'filterCutoff' | 'ampLevel' | 'pan' | 'oscMix' | 'wavePosition';
export type TempoSyncValue = '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32';
export type EngineMode = 'synth' | 'sample' | 'hybrid';
export type EffectType =
  | 'chorus'
  | 'phaser'
  | 'flanger'
  | 'delay'
  | 'reverb'
  | 'distortion'
  | 'compressor'
  | 'eq'
  | 'bitcrusher'
  | 'autoPan';

export type SynthPresetCategory =
  | 'Bass'
  | 'Lead'
  | 'Pad'
  | 'Pluck'
  | 'Bell'
  | 'FX'
  | 'Sequence'
  | 'Ambient'
  | 'Experimental'
  | 'Keys'
  | 'Piano'
  | 'E-Piano'
  | 'Organ'
  | 'Strings'
  | 'Choir'
  | 'Brass'
  | 'Woodwind'
  | 'Guitar'
  | 'Mallet'
  | 'Drum';

export type SampleCategory =
  | 'Piano'
  | 'E-Piano'
  | 'Organ'
  | 'Strings'
  | 'Choir'
  | 'Brass'
  | 'Woodwind'
  | 'Guitar'
  | 'Bass'
  | 'Bell'
  | 'Mallet'
  | 'Drum'
  | 'FX'
  | 'Experimental';

export interface OscillatorState {
  waveform: SynthWaveform;
  octave: number;
  semitone: number;
  fine: number;
  level: number;
}

export interface SubOscillatorState {
  enabled: boolean;
  waveform: SynthWaveform;
  octave: number;
  level: number;
}

export interface NoiseState {
  enabled: boolean;
  kind: NoiseKind;
  level: number;
}

export interface FilterState {
  type: FilterKind;
  cutoff: number;
  resonance: number;
  drive: number;
  keyTracking: number;
  envelopeAmount: number;
}

export interface EnvelopeState {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface LfoState {
  waveform: SynthWaveform;
  rate: number;
  depth: number;
  target: LfoTarget;
  sync: 'free' | 'tempo';
  syncValue: TempoSyncValue;
}

export interface WaveStep {
  id: string;
  waveform: SynthWaveform;
  pitchOffset: number;
  level: number;
  pan: number;
  duration: number;
  crossfade: number;
  repeat: boolean;
  skip: boolean;
  reverse: boolean;
}

export interface WaveSequencerState {
  enabled: boolean;
  tempoSync: boolean;
  steps: WaveStep[];
  currentStep: number;
}

export interface VectorMixerState {
  x: number;
  y: number;
}

export interface EffectState {
  id: string;
  type: EffectType;
  enabled: boolean;
  wet: number;
  params: Record<string, number>;
}

export interface SampleZone {
  id: string;
  url: string;
  rootNote: number;
  lowNote: number;
  highNote: number;
  lowVelocity?: number;
  highVelocity?: number;
  loop?: boolean;
  loopStart?: number;
  loopEnd?: number;
  gain?: number;
  pan?: number;
}

export interface SamplePresetDefinition {
  id: string;
  name: string;
  category: SampleCategory;
  author: string;
  description?: string;
  license?: string;
  sampleRate?: number;
  zones: SampleZone[];
}

export interface SampleBankManifest {
  id: string;
  name: string;
  author: string;
  description?: string;
  license: string;
  presets: SamplePresetDefinition[];
}

export interface SampleLayerState {
  enabled: boolean;
  bankId: string | null;
  presetId: string | null;
  level: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterEnabled: boolean;
  filterCutoff: number;
  filterResonance: number;
  oneShot: boolean;
  preload: boolean;
}

export interface SynthEngineState {
  engineMode: EngineMode;
  masterVolume: number;
  bpm: number;
  polyphony: number;
  oscA: OscillatorState;
  oscB: OscillatorState;
  subOsc: SubOscillatorState;
  noise: NoiseState;
  filter: FilterState;
  ampEnv: EnvelopeState;
  filterEnv: EnvelopeState;
  lfo1: LfoState;
  lfo2: LfoState;
  waveSequencer: WaveSequencerState;
  vectorMixer: VectorMixerState;
  sampleLayer: SampleLayerState;
  effects: EffectState[];
  currentPreset: string | null;
}

export interface SynthPreset {
  id: string;
  name: string;
  category: SynthPresetCategory;
  author: string;
  createdAt: string;
  engine: SynthEngineState;
}

export interface MeterSnapshot {
  peak: number;
  rms: number;
  clipping: boolean;
  audioState: AudioContextState | 'unavailable';
  activeVoices: number;
}
