export type EngineMode = 'synth' | 'sample' | 'hybrid';

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
