import type { EnvelopeState } from '../types/synth';
import { useSynthStore } from '../store/synthStore';

function EnvBlock({
  title,
  env,
  onChange,
}: {
  title: string;
  env: EnvelopeState;
  onChange: (partial: Partial<EnvelopeState>) => void;
}) {
  const controls: Array<keyof EnvelopeState> = ['attack', 'decay', 'sustain', 'release'];

  return (
    <div className="grid gap-3 rounded-md border border-slate-700/60 bg-black/15 p-3">
      <div className="panel-title">{title}</div>
      {controls.map((key) => (
        <label key={key} className="grid gap-1">
          <span className="control-label">{key}</span>
          <input
            className="range"
            type="range"
            min={key === 'sustain' ? 0 : 0.001}
            max={key === 'sustain' ? 1 : 4}
            step={key === 'sustain' ? 0.01 : 0.001}
            value={env[key]}
            onChange={(event) => onChange({ [key]: Number(event.target.value) })}
          />
          <span className="font-mono text-xs text-slate-400">{env[key].toFixed(3)}</span>
        </label>
      ))}
    </div>
  );
}

export function EnvelopePanel() {
  const ampEnv = useSynthStore((state) => state.ampEnv);
  const filterEnv = useSynthStore((state) => state.filterEnv);
  const updateEnvelope = useSynthStore((state) => state.updateEnvelope);

  return (
    <section className="panel grid gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="panel-title">Envelopes</h2>
        <div className="h-2 w-16 rounded-full bg-gradient-to-r from-synth-violet to-synth-mint" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-1">
        <EnvBlock title="Amp" env={ampEnv} onChange={(partial) => updateEnvelope('ampEnv', partial)} />
        <EnvBlock title="Filter" env={filterEnv} onChange={(partial) => updateEnvelope('filterEnv', partial)} />
      </div>
    </section>
  );
}
