import type { NoiseKind, OscillatorState, SynthWaveform } from '../types/synth';
import { useSynthStore } from '../store/synthStore';

const waveforms: SynthWaveform[] = ['sine', 'square', 'sawtooth', 'triangle', 'pulse', 'wavetable'];
const noiseKinds: NoiseKind[] = ['white', 'pink'];

function NumberControl({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="control-label">{label}</span>
      <input className="range" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="font-mono text-xs text-slate-400">{Number.isInteger(value) ? value : value.toFixed(2)}</span>
    </label>
  );
}

function OscBlock({
  title,
  osc,
  onChange,
}: {
  title: string;
  osc: OscillatorState;
  onChange: (partial: Partial<OscillatorState>) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-slate-700/60 bg-black/15 p-3">
      <div className="panel-title">{title}</div>
      <label className="grid gap-1">
        <span className="control-label">Waveform</span>
        <select className="mini-select" value={osc.waveform} onChange={(event) => onChange({ waveform: event.target.value as SynthWaveform })}>
          {waveforms.map((waveform) => (
            <option key={waveform} value={waveform}>
              {waveform}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-3">
        <NumberControl label="Oct" min={-2} max={2} step={1} value={osc.octave} onChange={(value) => onChange({ octave: value })} />
        <NumberControl label="Semi" min={-12} max={12} step={1} value={osc.semitone} onChange={(value) => onChange({ semitone: value })} />
        <NumberControl label="Fine" min={-50} max={50} step={1} value={osc.fine} onChange={(value) => onChange({ fine: value })} />
      </div>
      <NumberControl label="Level" min={0} max={1} step={0.01} value={osc.level} onChange={(value) => onChange({ level: value })} />
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
    <section className="panel grid gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="panel-title">Oscillators</h2>
        <div className="h-2 w-16 rounded-full bg-gradient-to-r from-synth-mint via-synth-cyan to-synth-violet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <OscBlock title="Oscillator A" osc={oscA} onChange={updateOscA} />
        <OscBlock title="Oscillator B" osc={oscB} onChange={updateOscB} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-3 rounded-md border border-slate-700/60 bg-black/15 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="panel-title">Sub</span>
            <input type="checkbox" checked={subOsc.enabled} onChange={(event) => updateSubOsc({ enabled: event.target.checked })} />
          </div>
          <label className="grid gap-1">
            <span className="control-label">Waveform</span>
            <select className="mini-select" value={subOsc.waveform} onChange={(event) => updateSubOsc({ waveform: event.target.value as SynthWaveform })}>
              {waveforms.map((waveform) => (
                <option key={waveform} value={waveform}>
                  {waveform}
                </option>
              ))}
            </select>
          </label>
          <NumberControl label="Oct" min={-3} max={0} step={1} value={subOsc.octave} onChange={(value) => updateSubOsc({ octave: value })} />
          <NumberControl label="Level" min={0} max={1} step={0.01} value={subOsc.level} onChange={(value) => updateSubOsc({ level: value })} />
        </div>

        <div className="grid gap-3 rounded-md border border-slate-700/60 bg-black/15 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="panel-title">Noise</span>
            <input type="checkbox" checked={noise.enabled} onChange={(event) => updateNoise({ enabled: event.target.checked })} />
          </div>
          <label className="grid gap-1">
            <span className="control-label">Type</span>
            <select className="mini-select" value={noise.kind} onChange={(event) => updateNoise({ kind: event.target.value as NoiseKind })}>
              {noiseKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <NumberControl label="Level" min={0} max={1} step={0.01} value={noise.level} onChange={(value) => updateNoise({ level: value })} />
        </div>
      </div>
    </section>
  );
}
