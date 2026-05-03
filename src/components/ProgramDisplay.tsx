import type { SynthEngineState, SynthPreset } from '../types/synth';
import { PresetArtwork } from './PresetArtwork';

interface ProgramDisplayProps {
  engine: SynthEngineState;
  preset?: SynthPreset;
  status: string;
}

export function ProgramDisplay({ engine, preset, status }: ProgramDisplayProps) {
  const programName = preset?.name ?? 'Manual Patch';
  const detail = preset ? `${preset.category} / ${preset.author}` : 'Live engine state';

  return (
    <div className="program-display">
      <div className="program-display-copy">
        <div className="program-display-eyebrow">Program</div>
        <div className="program-display-name">{programName}</div>
        <div className="program-display-detail">{detail}</div>
        <div className="program-display-status">{status}</div>
      </div>
      <PresetArtwork preset={preset} engine={engine} size="hero" />
    </div>
  );
}
