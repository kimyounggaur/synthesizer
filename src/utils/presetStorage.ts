import type { SynthEngineState, SynthPreset } from '../types/synth';
import { createId } from './audioMath';

const STORAGE_KEY = 'wave-vector-hybrid-synth:user-presets';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validatePreset(value: unknown): value is SynthPreset {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.category === 'string' &&
    typeof value.author === 'string' &&
    typeof value.createdAt === 'string' &&
    isRecord(value.engine)
  );
}

export function readUserPresets(): SynthPreset[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(validatePreset);
  } catch {
    return [];
  }
}

export function writeUserPresets(presets: SynthPreset[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function createUserPreset(name: string, engine: SynthEngineState): SynthPreset {
  return {
    id: createId('user-preset'),
    name,
    category: 'Experimental',
    author: 'User',
    createdAt: new Date().toISOString(),
    engine: {
      ...engine,
      currentPreset: null,
    },
  };
}

export function exportPresets(presets: SynthPreset[]): string {
  return JSON.stringify(presets, null, 2);
}

export function parsePresetImport(json: string): SynthPreset[] {
  const parsed: unknown = JSON.parse(json);
  const values = Array.isArray(parsed) ? parsed : [parsed];
  const valid = values.filter(validatePreset);

  if (valid.length === 0) {
    throw new Error('No valid presets found in JSON.');
  }

  return valid;
}
