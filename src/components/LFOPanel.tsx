import type { LfoState, LfoTarget, SynthWaveform, TempoSyncValue } from '../types/synth';
import { useSynthStore } from '../store/synthStore';
import { Knob } from './ui/Knob';
import { MiniDisplay } from './ui/MiniDisplay';
import { SectionPanel } from './ui/SectionPanel';

const waveforms: SynthWaveform[] = ['sine', 'triangle', 'square', 'sawtooth', 'pulse', 'wavetable'];
const targets: LfoTarget[] = ['filterCutoff', 'pitch', 'ampLevel', 'pan', 'oscMix', 'wavePosition'];
const syncValues: TempoSyncValue[] = ['1/1', '1/2', '1/4', '1/8', '1/16', '1/32'];

function formatDepth(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function LfoBlock({
  title,
  lfo,
  onChange,
}: {
  title: string;
  lfo: LfoState;
  onChange: (partial: Partial<LfoState>) => void;
}) {
  return (
    <div className="module-block module-block-violet lfo-block">
      <MiniDisplay eyebrow={title} value={lfo.target.toUpperCase()} detail={`${lfo.waveform} / ${lfo.sync === 'free' ? `${lfo.rate.toFixed(2)} Hz` : lfo.syncValue}`} tone="cyan" />
      <div className="lfo-control-grid">
        <label className="compact-control">
          <span className="control-label">Wave</span>
          <select className="mini-select panel-select" value={lfo.waveform} onChange={(event) => onChange({ waveform: event.target.value as SynthWaveform })}>
            {waveforms.map((waveform) => (
              <option key={waveform} value={waveform}>
                {waveform}
              </option>
            ))}
          </select>
        </label>
        <label className="compact-control">
          <span className="control-label">Target</span>
          <select className="mini-select panel-select" value={lfo.target} onChange={(event) => onChange({ target: event.target.value as LfoTarget })}>
            {targets.map((target) => (
              <option key={target} value={target}>
                {target}
              </option>
            ))}
          </select>
        </label>
        <label className="compact-control">
          <span className="control-label">Sync</span>
          <select className="mini-select panel-select" value={lfo.sync} onChange={(event) => onChange({ sync: event.target.value as LfoState['sync'] })}>
            <option value="free">free</option>
            <option value="tempo">tempo</option>
          </select>
        </label>
        <label className="compact-control">
          <span className="control-label">Division</span>
          <select className="mini-select panel-select" value={lfo.syncValue} onChange={(event) => onChange({ syncValue: event.target.value as TempoSyncValue })}>
            {syncValues.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="knob-grid knob-grid-four">
        <Knob label="Rate" min={0.01} max={30} step={0.01} value={lfo.rate} onChange={(value) => onChange({ rate: value })} displayValue={`${lfo.rate.toFixed(2)} Hz`} tone="violet" />
        <Knob label="Depth" min={0} max={1} step={0.01} value={lfo.depth} onChange={(value) => onChange({ depth: value })} displayValue={formatDepth(lfo.depth)} tone="cyan" />
      </div>
    </div>
  );
}

export function LFOPanel() {
  const lfo1 = useSynthStore((state) => state.lfo1);
  const lfo2 = useSynthStore((state) => state.lfo2);
  const updateLFO = useSynthStore((state) => state.updateLFO);

  return (
    <SectionPanel title="LFO" eyebrow="Modulation sources" accent="violet" className="lfo-panel">
      <div className="lfo-panel-grid">
        <LfoBlock title="LFO 1" lfo={lfo1} onChange={(partial) => updateLFO('lfo1', partial)} />
        <LfoBlock title="LFO 2" lfo={lfo2} onChange={(partial) => updateLFO('lfo2', partial)} />
      </div>
    </SectionPanel>
  );
}
