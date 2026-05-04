import { createDefaultEngineState } from '../store/synthStore';
import type { SynthPreset } from '../types/synth';

const createdAt = '2026-05-03T00:00:00.000Z';

function samplePreset(id: string, name: string, category: SynthPreset['category'], bankId: string, presetId: string): SynthPreset {
  const engine = createDefaultEngineState();

  return {
    id: `sample-${id}`,
    name,
    category,
    author: 'Factory',
    createdAt,
    engine: {
      ...engine,
      engineMode: 'sample',
      sampleLayer: {
        ...engine.sampleLayer,
        enabled: true,
        bankId,
        presetId,
        level: 0.85,
      },
    },
  };
}

export const sampleFactoryPresets: SynthPreset[] = [
  samplePreset('soft-piano-lite', 'Soft Piano Lite', 'Piano', 'demo-lite', 'soft-piano-lite'),
  samplePreset('warm-strings-lite', 'Warm Strings Lite', 'Strings', 'demo-lite', 'warm-strings-lite'),
];
