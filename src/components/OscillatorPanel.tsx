import type { NoiseKind, OscillatorState, SynthWaveform } from '../types/synth';
import { useSynthStore } from '../store/synthStore';
import { Knob } from './ui/Knob';
import { LedButton } from './ui/LedButton';
import { MiniDisplay } from './ui/MiniDisplay';
import { SectionPanel } from './ui/SectionPanel';

const waveforms: SynthWaveform[] = ['sine', 'square', 'sawtooth', 'triangle', 'pulse', 'wavetable'];
const noiseKinds: NoiseKind[] = ['white', 'pink'];

function formatLevel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function WaveSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="compact-control">
      <span className="control-label">{label}</span>
      <select className="mini-select panel-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function OscBlock({
  title,
  osc,
  tone,
  onChange,
}: {
  title: string;
  osc: OscillatorState;
  tone: 'cyan' | 'violet';
  onChange: (partial: Partial<OscillatorState>) => void;
}) {
  return (
    <div className={`module-block module-block-${tone}`}>
      <div className="module-block-header">
        <MiniDisplay eyebrow={title} value={osc.waveform.toUpperCase()} detail={`Oct ${osc.octave} / Semi ${osc.semitone}`} tone={tone === 'cyan' ? 'cyan' : 'mint'} />
        <WaveSelect label="Wave" value={osc.waveform} options={waveforms} onChange={(value) => onChange({ waveform: value as SynthWaveform })} />
      </div>

      <div className="knob-grid knob-grid-four">
        <Knob label="Oct" min={-2} max={2} step={1} value={osc.octave} onChange={(value) => onChange({ octave: value })} tone={tone} />
        <Knob label="Semi" min={-12} max={12} step={1} value={osc.semitone} onChange={(value) => onChange({ semitone: value })} tone={tone} />
        <Knob label="Fine" min={-50} max={50} step={1} value={osc.fine} onChange={(value) => onChange({ fine: value })} tone={tone} />
        <Knob label="Level" min={0} max={1} step={0.01} value={osc.level} onChange={(value) => onChange({ level: value })} displayValue={formatLevel(osc.level)} tone={tone} />
      </div>
    </div>
  );
}

export function OscillatorPanel() {
  const oscA = useSynthStore((state) => state.oscA);
  const oscB = useSynthStore((state) => state.oscB);
  const subOsc = useSynthStore((state) => state.subOsc);
  const noise = useSynthStore((state) => state.noise);
  const updateOscA = useSynthStore((state) => state.updateOscA);
  const updateOscB = useSynthStore((state) => state.updateOscB);
  const updateSubOsc = useSynthStore((state) => state.updateSubOsc);
  const updateNoise = useSynthStore((state) => state.updateNoise);

  return (
    <SectionPanel title="Oscillators" eyebrow="Sound source" accent="cyan" className="osc-panel">
      <div className="oscillator-stack">
        <div className="grid gap-3 xl:grid-cols-2">
          <OscBlock title="Osc A" osc={oscA} tone="cyan" onChange={updateOscA} />
          <OscBlock title="Osc B" osc={oscB} tone="violet" onChange={updateOscB} />
        </div>

        <div className="sub-module-grid">
          <div className="module-block module-block-mint">
            <div className="module-inline-header">
              <MiniDisplay eyebrow="Sub oscillator" value={subOsc.enabled ? 'ONLINE' : 'MUTED'} detail={subOsc.waveform.toUpperCase()} tone="mint" />
              <LedButton active={subOsc.enabled} onClick={() => updateSubOsc({ enabled: !subOsc.enabled })}>
                Sub
              </LedButton>
            </div>
            <div className="sub-controls">
              <WaveSelect label="Wave" value={subOsc.waveform} options={waveforms} onChange={(value) => updateSubOsc({ waveform: value as SynthWaveform })} />
              <Knob label="Oct" min={-3} max={0} step={1} value={subOsc.octave} onChange={(value) => updateSubOsc({ octave: value })} tone="mint" />
              <Knob label="Level" min={0} max={1} step={0.01} value={subOsc.level} onChange={(value) => updateSubOsc({ level: value })} displayValue={formatLevel(subOsc.level)} tone="mint" />
            </div>
          </div>

          <div className="module-block module-block-amber">
            <div className="module-inline-header">
              <MiniDisplay eyebrow="Noise generator" value={noise.enabled ? 'ONLINE' : 'MUTED'} detail={noise.kind.toUpperCase()} tone="amber" />
              <LedButton active={noise.enabled} onClick={() => updateNoise({ enabled: !noise.enabled })}>
                Noise
              </LedButton>
            </div>
            <div className="sub-controls">
              <WaveSelect label="Type" value={noise.kind} options={noiseKinds} onChange={(value) => updateNoise({ kind: value as NoiseKind })} />
              <Knob label="Level" min={0} max={1} step={0.01} value={noise.level} onChange={(value) => updateNoise({ level: value })} displayValue={formatLevel(noise.level)} tone="amber" />
            </div>
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}
