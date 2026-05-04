import { create } from 'zustand';
import type { EngineMode, SampleLayerState } from '../types/soundfont';
import type {
  EffectState,
  EnvelopeState,
  FilterState,
  LfoState,
  NoiseState,
  OscillatorState,
  SubOscillatorState,
  SynthEngineState,
  SynthPreset,
  VectorMixerState,
  WaveSequencerState,
  WaveStep,
} from '../types/synth';

function createDefaultWaveSteps(): WaveStep[] {
  return Array.from({ length: 16 }, (_, index) => ({
    id: `step-${index + 1}`,
    waveform: index % 3 === 0 ? 'sawtooth' : index % 3 === 1 ? 'pulse' : 'wavetable',
    pitchOffset: index % 2 === 0 ? 0 : 12,
    level: 0.72,
    pan: 0,
    duration: 180,
    crossfade: 40,
    repeat: false,
    skip: false,
    reverse: false,
  }));
}

export function createDefaultSampleLayerState(): SampleLayerState {
  return {
    enabled: false,
    bankId: null,
    presetId: null,
    level: 0.85,
    attack: 0.003,
    decay: 0.2,
    sustain: 1,
    release: 0.6,
    filterEnabled: false,
    filterCutoff: 12000,
    filterResonance: 0.8,
    oneShot: false,
    preload: true,
  };
}

export function createDefaultEngineState(): SynthEngineState {
  return {
    engineMode: 'synth',
    masterVolume: 0.72,
    bpm: 118,
    polyphony: 8,
    oscA: {
      waveform: 'sawtooth',
      octave: 0,
      semitone: 0,
      fine: 0,
      level: 0.84,
    },
    oscB: {
      waveform: 'pulse',
      octave: 0,
      semitone: 7,
      fine: -6,
      level: 0.62,
    },
    subOsc: {
      enabled: true,
      waveform: 'square',
      octave: -1,
      level: 0.24,
    },
    noise: {
      enabled: false,
      kind: 'white',
      level: 0.08,
    },
    filter: {
      type: 'ladder',
      cutoff: 1800,
      resonance: 4.2,
      drive: 0.18,
      keyTracking: 0.2,
      envelopeAmount: 0.22,
    },
    ampEnv: {
      attack: 0.012,
      decay: 0.18,
      sustain: 0.7,
      release: 0.28,
    },
    filterEnv: {
      attack: 0.018,
      decay: 0.22,
      sustain: 0.42,
      release: 0.2,
    },
    lfo1: {
      waveform: 'triangle',
      rate: 4,
      depth: 0,
      target: 'filterCutoff',
      sync: 'free',
      syncValue: '1/4',
    },
    lfo2: {
      waveform: 'sine',
      rate: 0.3,
      depth: 0,
      target: 'pan',
      sync: 'free',
      syncValue: '1/2',
    },
    waveSequencer: {
      enabled: false,
      tempoSync: true,
      steps: createDefaultWaveSteps(),
      currentStep: 0,
    },
    vectorMixer: {
      x: 0.48,
      y: 0.08,
    },
    sampleLayer: createDefaultSampleLayerState(),
    effects: [],
    currentPreset: null,
  };
}

export function normalizeEngineState(engine: Partial<SynthEngineState>): SynthEngineState {
  const defaults = createDefaultEngineState();
  return {
    ...defaults,
    ...engine,
    oscA: { ...defaults.oscA, ...engine.oscA },
    oscB: { ...defaults.oscB, ...engine.oscB },
    subOsc: { ...defaults.subOsc, ...engine.subOsc },
    noise: { ...defaults.noise, ...engine.noise },
    filter: { ...defaults.filter, ...engine.filter },
    ampEnv: { ...defaults.ampEnv, ...engine.ampEnv },
    filterEnv: { ...defaults.filterEnv, ...engine.filterEnv },
    lfo1: { ...defaults.lfo1, ...engine.lfo1 },
    lfo2: { ...defaults.lfo2, ...engine.lfo2 },
    waveSequencer: {
      ...defaults.waveSequencer,
      ...engine.waveSequencer,
      steps: engine.waveSequencer?.steps ?? defaults.waveSequencer.steps,
    },
    vectorMixer: { ...defaults.vectorMixer, ...engine.vectorMixer },
    sampleLayer: { ...defaults.sampleLayer, ...engine.sampleLayer },
    effects: engine.effects ?? defaults.effects,
  };
}

export interface SynthStore extends SynthEngineState {
  activeNotes: Record<number, number>;
  keyboardOctave: number;
  defaultVelocity: number;
  setEngineMode: (mode: EngineMode) => void;
  updateOscA: (partial: Partial<OscillatorState>) => void;
  updateOscB: (partial: Partial<OscillatorState>) => void;
  updateSubOsc: (partial: Partial<SubOscillatorState>) => void;
  updateNoise: (partial: Partial<NoiseState>) => void;
  updateFilter: (partial: Partial<FilterState>) => void;
  updateEnvelope: (target: 'ampEnv' | 'filterEnv', partial: Partial<EnvelopeState>) => void;
  updateLFO: (target: 'lfo1' | 'lfo2', partial: Partial<LfoState>) => void;
  updateWaveSequencer: (partial: Partial<WaveSequencerState>) => void;
  updateWaveStep: (index: number, partial: Partial<WaveStep>) => void;
  reorderWaveSteps: (from: number, to: number) => void;
  updateVectorPosition: (partial: Partial<VectorMixerState>) => void;
  updateSampleLayer: (partial: Partial<SampleLayerState>) => void;
  loadSamplePreset: (bankId: string, presetId: string) => void;
  addEffect: (effect: EffectState) => void;
  updateEffect: (id: string, partial: Partial<EffectState>) => void;
  removeEffect: (id: string) => void;
  reorderEffects: (from: number, to: number) => void;
  loadPreset: (preset: SynthPreset) => void;
  savePreset: (id: string) => void;
  resetSynth: () => void;
  setMasterVolume: (value: number) => void;
  setBpm: (value: number) => void;
  setPolyphony: (value: number) => void;
  setKeyboardOctave: (value: number) => void;
  setDefaultVelocity: (value: number) => void;
  setActiveNote: (note: number, velocity: number) => void;
  clearActiveNote: (note: number) => void;
  clearActiveNotes: () => void;
}

const defaultEngine = createDefaultEngineState();

function reorder<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export const useSynthStore = create<SynthStore>((set) => ({
  ...defaultEngine,
  activeNotes: {},
  keyboardOctave: 3,
  defaultVelocity: 0.82,
  setEngineMode: (mode) => set({ engineMode: mode }),
  updateOscA: (partial) => set((state) => ({ oscA: { ...state.oscA, ...partial } })),
  updateOscB: (partial) => set((state) => ({ oscB: { ...state.oscB, ...partial } })),
  updateSubOsc: (partial) => set((state) => ({ subOsc: { ...state.subOsc, ...partial } })),
  updateNoise: (partial) => set((state) => ({ noise: { ...state.noise, ...partial } })),
  updateFilter: (partial) => set((state) => ({ filter: { ...state.filter, ...partial } })),
  updateEnvelope: (target, partial) => set((state) => ({ [target]: { ...state[target], ...partial } })),
  updateLFO: (target, partial) => set((state) => ({ [target]: { ...state[target], ...partial } })),
  updateWaveSequencer: (partial) => set((state) => ({ waveSequencer: { ...state.waveSequencer, ...partial } })),
  updateWaveStep: (index, partial) =>
    set((state) => ({
      waveSequencer: {
        ...state.waveSequencer,
        steps: state.waveSequencer.steps.map((step, stepIndex) => (stepIndex === index ? { ...step, ...partial } : step)),
      },
    })),
  reorderWaveSteps: (from, to) =>
    set((state) => ({
      waveSequencer: {
        ...state.waveSequencer,
        steps: reorder(state.waveSequencer.steps, from, to),
      },
    })),
  updateVectorPosition: (partial) => set((state) => ({ vectorMixer: { ...state.vectorMixer, ...partial } })),
  updateSampleLayer: (partial) => set((state) => ({ sampleLayer: { ...state.sampleLayer, ...partial } })),
  loadSamplePreset: (bankId, presetId) =>
    set((state) => ({
      engineMode: state.engineMode === 'hybrid' ? 'hybrid' : 'sample',
      sampleLayer: {
        ...state.sampleLayer,
        enabled: true,
        bankId,
        presetId,
      },
      currentPreset: `sample:${bankId}:${presetId}`,
      activeNotes: {},
    })),
  addEffect: (effect) => set((state) => ({ effects: [...state.effects, effect] })),
  updateEffect: (id, partial) =>
    set((state) => ({
      effects: state.effects.map((effect) => (effect.id === id ? { ...effect, ...partial, params: partial.params ?? effect.params } : effect)),
    })),
  removeEffect: (id) => set((state) => ({ effects: state.effects.filter((effect) => effect.id !== id) })),
  reorderEffects: (from, to) => set((state) => ({ effects: reorder(state.effects, from, to) })),
  loadPreset: (preset) => set({ ...normalizeEngineState(preset.engine), currentPreset: preset.id, activeNotes: {} }),
  savePreset: (id) => set({ currentPreset: id }),
  resetSynth: () => set({ ...createDefaultEngineState(), activeNotes: {} }),
  setMasterVolume: (value) => set({ masterVolume: value }),
  setBpm: (value) => set({ bpm: value }),
  setPolyphony: (value) => set({ polyphony: value }),
  setKeyboardOctave: (value) => set({ keyboardOctave: Math.min(6, Math.max(1, value)) }),
  setDefaultVelocity: (value) => set({ defaultVelocity: Math.min(1, Math.max(0.05, value)) }),
  setActiveNote: (note, velocity) => set((state) => ({ activeNotes: { ...state.activeNotes, [note]: velocity } })),
  clearActiveNote: (note) =>
    set((state) => {
      const next = { ...state.activeNotes };
      delete next[note];
      return { activeNotes: next };
    }),
  clearActiveNotes: () => set({ activeNotes: {} }),
}));

export function selectEngineState(state: SynthStore): SynthEngineState {
  return {
    engineMode: state.engineMode,
    masterVolume: state.masterVolume,
    bpm: state.bpm,
    polyphony: state.polyphony,
    oscA: state.oscA,
    oscB: state.oscB,
    subOsc: state.subOsc,
    noise: state.noise,
    filter: state.filter,
    ampEnv: state.ampEnv,
    filterEnv: state.filterEnv,
    lfo1: state.lfo1,
    lfo2: state.lfo2,
    waveSequencer: state.waveSequencer,
    vectorMixer: state.vectorMixer,
    sampleLayer: state.sampleLayer,
    effects: state.effects,
    currentPreset: state.currentPreset,
  };
}
