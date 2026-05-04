import type { SamplePresetDefinition } from '../types/soundfont';
import type { SynthEngineState, SynthPreset } from '../types/synth';
import { PresetArtwork } from './PresetArtwork';

interface ProgramDisplayProps {
  engine: SynthEngineState;
  preset?: SynthPreset;
  samplePreset?: SamplePresetDefinition;
  status: string;
}

export function ProgramDisplay({ engine, preset, samplePreset, status }: ProgramDisplayProps) {
  const sampleArtworkPreset = samplePreset ? { id: samplePreset.id, category: samplePreset.category } : undefined;
  const programName = preset?.name ?? samplePreset?.name ?? 'Manual Patch';
  const detail = preset ? `${preset.category} / ${preset.author}` : samplePreset ? `${samplePreset.category} sample / ${samplePreset.author}` : 'Live engine state';
  const mode = engine.engineMode === 'synth' ? 'SYNTH' : engine.engineMode === 'sample' ? 'SAMPLE' : 'HYBRID';

  return (
    <div className="program-display">
      <div className="program-display-copy">
        <div className="program-display-eyebrow">Program</div>
        <div className="program-display-name">{programName}</div>
        <div className="program-display-detail">{detail}</div>
        <div className="program-display-status">
          {mode} / {status}
        </div>
      </div>
      <PresetArtwork preset={preset ?? sampleArtworkPreset} engine={engine} size="hero" />
    </div>
  );
}
