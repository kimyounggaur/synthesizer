import type { EnvelopeState } from '../types/synth';
import { useSynthStore } from '../store/synthStore';
import { Knob } from './ui/Knob';
import { MiniDisplay } from './ui/MiniDisplay';
import { SectionPanel } from './ui/SectionPanel';

const controls: Array<keyof EnvelopeState> = ['attack', 'decay', 'sustain', 'release'];

function formatEnvelopeValue(key: keyof EnvelopeState, value: number): string {
  if (key === 'sustain') {
    return `${Math.round(value * 100)}%`;
  }

  return value >= 1 ? `${value.toFixed(2)}s` : `${Math.round(value * 1000)}ms`;
}

function labelFor(key: keyof EnvelopeState): string {
  return key === 'attack' ? 'Attack' : key === 'decay' ? 'Decay' : key === 'sustain' ? 'Sustain' : 'Release';
}

function EnvBlock({
  title,
  env,
  onChange,
}: {
  title: string;
  env: EnvelopeState;
  onChange: (partial: Partial<EnvelopeState>) => void;
}) {
  return (
    <div className="module-block module-block-amber env-block">
      <MiniDisplay
        eyebrow={`${title} envelope`}
        value="ADSR"
        detail={`A ${formatEnvelopeValue('attack', env.attack)} / R ${formatEnvelopeValue('release', env.release)}`}
        tone="amber"
      />
      <div className="knob-grid env-knob-grid">
        {controls.map((key) => (
          <Knob
            key={key}
            label={labelFor(key)}
            min={key === 'sustain' ? 0 : 0.001}
            max={key === 'sustain' ? 1 : 4}
            step={key === 'sustain' ? 0.01 : 0.001}
            value={env[key]}
            onChange={(value) => onChange({ [key]: value })}
            displayValue={formatEnvelopeValue(key, env[key])}
            tone={key === 'sustain' ? 'amber' : 'violet'}
          />
        ))}
      </div>
    </div>
  );
}

export function EnvelopePanel() {
  const ampEnv = useSynthStore((state) => state.ampEnv);
  const filterEnv = useSynthStore((state) => state.filterEnv);
  const updateEnvelope = useSynthStore((state) => state.updateEnvelope);

  return (
    <SectionPanel title="Envelopes" eyebrow="Contour generators" accent="red" className="envelope-panel">
      <div className="envelope-grid">
        <EnvBlock title="Amp" env={ampEnv} onChange={(partial) => updateEnvelope('ampEnv', partial)} />
        <EnvBlock title="Filter" env={filterEnv} onChange={(partial) => updateEnvelope('filterEnv', partial)} />
      </div>
    </SectionPanel>
  );
}
