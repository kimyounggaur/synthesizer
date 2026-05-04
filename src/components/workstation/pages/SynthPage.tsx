import type { NoiseKind, OscillatorState, SynthWaveform } from '../../../types/synth';
import { useSynthStore } from '../../../store/synthStore';
import { Knob } from '../../ui/Knob';
import { LedButton } from '../../ui/LedButton';
import { MiniDisplay } from '../../ui/MiniDisplay';

const waveforms: SynthWaveform[] = ['sine', 'square', 'sawtooth', 'triangle', 'pulse', 'wavetable'];
const noiseKinds: NoiseKind[] = ['white', 'pink'];

function formatLevel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function SelectControl({
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
    <label className="compact-control workstation-select-control">
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

function OscillatorEditBlock({
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
    <section className={`module-block module-block-${tone} workstation-card workstation-card-wide`}>
      <div className="workstation-card-header">
        <MiniDisplay eyebrow={title} value={osc.waveform.toUpperCase()} detail={`Oct ${osc.octave} / Semi ${osc.semitone} / Fine ${osc.fine}`} tone={tone === 'cyan' ? 'cyan' : 'mint'} />
        <SelectControl label="Waveform" value={osc.waveform} options={waveforms} onChange={(value) => onChange({ waveform: value as SynthWaveform })} />
      </div>

      <div className="workstation-knob-grid workstation-osc-knobs">
        <Knob label="Octave" min={-2} max={2} step={1} value={osc.octave} onChange={(value) => onChange({ octave: value })} tone={tone} />
        <Knob label="Semi" min={-12} max={12} step={1} value={osc.semitone} onChange={(value) => onChange({ semitone: value })} tone={tone} />
        <Knob label="Fine" min={-50} max={50} step={1} value={osc.fine} onChange={(value) => onChange({ fine: value })} tone={tone} />
        <Knob label="Level" min={0} max={1} step={0.01} value={osc.level} onChange={(value) => onChange({ level: value })} displayValue={formatLevel(osc.level)} tone={tone} />
      </div>
    </section>
  );
}

export function SynthPage() {
  const oscA = useSynthStore((state) => state.oscA);
  const oscB = useSynthStore((state) => state.oscB);
  const subOsc = useSynthStore((state) => state.subOsc);
  const noise = useSynthStore((state) => state.noise);
  const updateOscA = useSynthStore((state) => state.updateOscA);
  const updateOscB = useSynthStore((state) => state.updateOscB);
  const updateSubOsc = useSynthStore((state) => state.updateSubOsc);
  const updateNoise = useSynthStore((state) => state.updateNoise);

  return (
    <div className="workstation-page workstation-lcd-page synth-page">
      <header className="workstation-page-header">
        <MiniDisplay eyebrow="OSCILLATOR EDIT" value="OSC BASIC" detail="Osc A / Osc B / Sub / Noise" tone="cyan" />
        <nav className="workstation-subtabs" aria-label="Oscillator edit sections">
          <span className="workstation-subtab is-active">OSC BASIC</span>
          <span className="workstation-subtab">SUB/NOISE</span>
          <span className="workstation-subtab">MIX</span>
        </nav>
      </header>

      <div className="workstation-page-grid workstation-osc-grid">
        <OscillatorEditBlock title="OSC A" osc={oscA} tone="cyan" onChange={updateOscA} />
        <OscillatorEditBlock title="OSC B" osc={oscB} tone="violet" onChange={updateOscB} />

        <section className="module-block module-block-mint workstation-card">
          <div className="workstation-card-header">
            <MiniDisplay eyebrow="SUB" value={subOsc.enabled ? 'ON' : 'OFF'} detail={subOsc.waveform.toUpperCase()} tone="mint" />
            <LedButton active={subOsc.enabled} onClick={() => updateSubOsc({ enabled: !subOsc.enabled })}>
              Sub
            </LedButton>
          </div>

          <div className="workstation-source-grid">
            <SelectControl label="Waveform" value={subOsc.waveform} options={waveforms} onChange={(value) => updateSubOsc({ waveform: value as SynthWaveform })} />
            <Knob label="Octave" min={-3} max={0} step={1} value={subOsc.octave} onChange={(value) => updateSubOsc({ octave: value })} tone="mint" />
            <Knob label="Level" min={0} max={1} step={0.01} value={subOsc.level} onChange={(value) => updateSubOsc({ level: value })} displayValue={formatLevel(subOsc.level)} tone="mint" />
          </div>
        </section>

        <section className="module-block module-block-amber workstation-card">
          <div className="workstation-card-header">
            <MiniDisplay eyebrow="NOISE" value={noise.enabled ? 'ON' : 'OFF'} detail={noise.kind.toUpperCase()} tone="amber" />
            <LedButton active={noise.enabled} onClick={() => updateNoise({ enabled: !noise.enabled })}>
              Noise
            </LedButton>
          </div>

          <div className="workstation-source-grid workstation-noise-grid">
            <SelectControl label="Type" value={noise.kind} options={noiseKinds} onChange={(value) => updateNoise({ kind: value as NoiseKind })} />
            <Knob label="Level" min={0} max={1} step={0.01} value={noise.level} onChange={(value) => updateNoise({ level: value })} displayValue={formatLevel(noise.level)} tone="amber" />
          </div>
        </section>
      </div>
    </div>
  );
}
