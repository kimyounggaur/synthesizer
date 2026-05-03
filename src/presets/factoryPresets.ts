import { createDefaultEngineState } from '../store/synthStore';
import type { SynthEngineState, SynthPreset } from '../types/synth';

function engine(overrides: Partial<SynthEngineState>): SynthEngineState {
  return {
    ...createDefaultEngineState(),
    ...overrides,
  };
}

export const factoryPresets: SynthPreset[] = [
  {
    id: 'factory-analog-deep-bass',
    name: 'Analog Deep Bass',
    category: 'Bass',
    author: 'Factory',
    createdAt: '2026-05-03T00:00:00.000Z',
    engine: engine({
      oscA: { waveform: 'sawtooth', octave: -1, semitone: 0, fine: 0, level: 0.88 },
      oscB: { waveform: 'square', octave: -1, semitone: 0, fine: 3, level: 0.46 },
      subOsc: { enabled: true, waveform: 'sine', octave: -2, level: 0.38 },
      filter: { type: 'ladder', cutoff: 720, resonance: 5.5, drive: 0.42, keyTracking: 0.18, envelopeAmount: 0.34 },
      ampEnv: { attack: 0.006, decay: 0.14, sustain: 0.82, release: 0.16 },
      filterEnv: { attack: 0.004, decay: 0.24, sustain: 0.24, release: 0.12 },
      vectorMixer: { x: 0.32, y: 0.12 },
    }),
  },
  {
    id: 'factory-bright-saw-lead',
    name: 'Bright Saw Lead',
    category: 'Lead',
    author: 'Factory',
    createdAt: '2026-05-03T00:00:00.000Z',
    engine: engine({
      oscA: { waveform: 'sawtooth', octave: 0, semitone: 0, fine: -4, level: 0.78 },
      oscB: { waveform: 'sawtooth', octave: 0, semitone: 7, fine: 5, level: 0.64 },
      subOsc: { enabled: false, waveform: 'square', octave: -1, level: 0 },
      filter: { type: 'lowpass', cutoff: 4200, resonance: 3.4, drive: 0.16, keyTracking: 0.36, envelopeAmount: 0.12 },
      ampEnv: { attack: 0.01, decay: 0.08, sustain: 0.68, release: 0.24 },
      filterEnv: { attack: 0.01, decay: 0.12, sustain: 0.58, release: 0.18 },
      vectorMixer: { x: 0.52, y: 0 },
    }),
  },
  {
    id: 'factory-warm-vector-pad',
    name: 'Warm Vector Pad',
    category: 'Pad',
    author: 'Factory',
    createdAt: '2026-05-03T00:00:00.000Z',
    engine: engine({
      oscA: { waveform: 'triangle', octave: 0, semitone: 0, fine: -8, level: 0.7 },
      oscB: { waveform: 'wavetable', octave: 0, semitone: 12, fine: 8, level: 0.58 },
      subOsc: { enabled: true, waveform: 'sine', octave: -1, level: 0.14 },
      noise: { enabled: true, kind: 'pink', level: 0.08 },
      filter: { type: 'lowpass', cutoff: 2600, resonance: 1.2, drive: 0.08, keyTracking: 0.12, envelopeAmount: 0.08 },
      ampEnv: { attack: 0.72, decay: 1.1, sustain: 0.74, release: 1.6 },
      filterEnv: { attack: 1.1, decay: 1.4, sustain: 0.5, release: 1.2 },
      vectorMixer: { x: 0.44, y: 0.28 },
    }),
  },
  {
    id: 'factory-short-digital-pluck',
    name: 'Short Digital Pluck',
    category: 'Pluck',
    author: 'Factory',
    createdAt: '2026-05-03T00:00:00.000Z',
    engine: engine({
      oscA: { waveform: 'pulse', octave: 0, semitone: 0, fine: 0, level: 0.72 },
      oscB: { waveform: 'wavetable', octave: 1, semitone: 0, fine: 0, level: 0.46 },
      subOsc: { enabled: false, waveform: 'square', octave: -1, level: 0 },
      filter: { type: 'bandpass', cutoff: 3200, resonance: 7.8, drive: 0.1, keyTracking: 0.22, envelopeAmount: 0.32 },
      ampEnv: { attack: 0.002, decay: 0.22, sustain: 0.04, release: 0.18 },
      filterEnv: { attack: 0.002, decay: 0.18, sustain: 0.08, release: 0.14 },
      vectorMixer: { x: 0.42, y: 0 },
    }),
  },
  {
    id: 'factory-frozen-air',
    name: 'Frozen Air',
    category: 'Ambient',
    author: 'Factory',
    createdAt: '2026-05-03T00:00:00.000Z',
    engine: engine({
      oscA: { waveform: 'sine', octave: 0, semitone: 0, fine: -11, level: 0.5 },
      oscB: { waveform: 'wavetable', octave: 1, semitone: 5, fine: 11, level: 0.62 },
      subOsc: { enabled: true, waveform: 'triangle', octave: -1, level: 0.08 },
      noise: { enabled: true, kind: 'pink', level: 0.12 },
      filter: { type: 'notch', cutoff: 1900, resonance: 9.2, drive: 0.04, keyTracking: 0.08, envelopeAmount: -0.08 },
      ampEnv: { attack: 1.2, decay: 2.2, sustain: 0.64, release: 2.4 },
      filterEnv: { attack: 1.8, decay: 2.4, sustain: 0.5, release: 1.8 },
      vectorMixer: { x: 0.62, y: 0.2 },
    }),
  },
];
