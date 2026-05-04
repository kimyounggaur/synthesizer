import type { LfoState, LfoTarget, SynthWaveform, TempoSyncValue } from '../../../types/synth';
import { useSynthStore } from '../../../store/synthStore';
import { Knob } from '../../ui/Knob';
import { MiniDisplay } from '../../ui/MiniDisplay';
import { WorkstationBreadcrumb, WorkstationSoftKeys, WorkstationStatusBar } from '../WorkstationLCDChrome';

const waveforms: SynthWaveform[] = ['sine', 'triangle', 'square', 'sawtooth', 'pulse', 'wavetable'];
const targets: LfoTarget[] = ['filterCutoff', 'pitch', 'ampLevel', 'pan', 'oscMix', 'wavePosition'];
const syncValues: TempoSyncValue[] = ['1/1', '1/2', '1/4', '1/8', '1/16', '1/32'];

function formatDepth(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function targetLabel(target: LfoTarget): string {
  const labels: Record<LfoTarget, string> = {
    pitch: 'Pitch',
    filterCutoff: 'Filter Cutoff',
    ampLevel: 'Amp Level',
    pan: 'Pan',
    oscMix: 'Osc Mix',
    wavePosition: 'Wave Position',
  };
  return labels[target];
}

function SelectControl<T extends string>({
  label,
  value,
  options,
  onChange,
  getLabel = (option) => option,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  getLabel?: (option: T) => string;
}) {
  return (
    <label className="compact-control workstation-select-control">
      <span className="control-label">{label}</span>
      <select className="mini-select panel-select" value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {getLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function LfoEditBlock({
  title,
  lfo,
  onChange,
}: {
  title: string;
  lfo: LfoState;
  onChange: (partial: Partial<LfoState>) => void;
}) {
  const active = lfo.depth > 0;
  const rateDetail = lfo.sync === 'tempo' ? lfo.syncValue : `${lfo.rate.toFixed(2)} Hz`;

  return (
    <section className="module-block module-block-violet workstation-card modulation-lfo-card">
      <div className="workstation-card-header">
        <MiniDisplay eyebrow={title} value={targetLabel(lfo.target).toUpperCase()} detail={`${lfo.waveform} / ${rateDetail}`} tone="cyan" />
        <div className="modulation-status-stack">
          <span className={active ? 'workstation-led-dot is-active' : 'workstation-led-dot'} />
          <span className={lfo.sync === 'tempo' ? 'modulation-sync-badge is-active' : 'modulation-sync-badge'}>{lfo.sync === 'tempo' ? 'TEMPO' : 'FREE'}</span>
        </div>
      </div>

      <div className="modulation-control-grid">
        <SelectControl label="Waveform" value={lfo.waveform} options={waveforms} onChange={(value) => onChange({ waveform: value })} />
        <SelectControl label="Target" value={lfo.target} options={targets} onChange={(value) => onChange({ target: value })} getLabel={targetLabel} />
        <SelectControl label="Sync" value={lfo.sync} options={['free', 'tempo']} onChange={(value) => onChange({ sync: value })} />
        <SelectControl label="Division" value={lfo.syncValue} options={syncValues} onChange={(value) => onChange({ syncValue: value })} />
      </div>

      <div className="workstation-knob-grid modulation-knob-grid">
        <Knob label="Rate" min={0.01} max={30} step={0.01} value={lfo.rate} onChange={(value) => onChange({ rate: value })} displayValue={`${lfo.rate.toFixed(2)} Hz`} tone="violet" />
        <Knob label="Depth" min={0} max={1} step={0.01} value={lfo.depth} onChange={(value) => onChange({ depth: value })} displayValue={formatDepth(lfo.depth)} tone="cyan" />
      </div>

      <div className="modulation-routing-list" aria-label={`${title} target routing`}>
        {targets.map((target) => (
          <button key={target} type="button" className={lfo.target === target ? 'modulation-route-row is-active' : 'modulation-route-row'} onClick={() => onChange({ target })}>
            <span className="workstation-led-dot is-small" />
            <span>{targetLabel(target)}</span>
            <strong>{lfo.target === target ? formatDepth(lfo.depth) : '--'}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

export function ModulationPage() {
  const lfo1 = useSynthStore((state) => state.lfo1);
  const lfo2 = useSynthStore((state) => state.lfo2);
  const updateLFO = useSynthStore((state) => state.updateLFO);

  return (
    <div className="workstation-page workstation-lcd-page modulation-page">
      <header className="workstation-page-header">
        <MiniDisplay eyebrow="MODULATION" value="LFO MATRIX" detail="LFO 1 / LFO 2 routing" tone="cyan" />
        <nav className="workstation-subtabs" aria-label="Modulation sections">
          <span className="workstation-subtab is-active">LFO</span>
          <span className="workstation-subtab">ROUTING</span>
          <span className="workstation-subtab">SYNC</span>
        </nav>
      </header>

      <WorkstationBreadcrumb items={['SYNTH', 'MODULATION', 'LFO MATRIX']} />

      <div className="workstation-page-grid modulation-page-grid">
        <LfoEditBlock title="LFO 1" lfo={lfo1} onChange={(partial) => updateLFO('lfo1', partial)} />
        <LfoEditBlock title="LFO 2" lfo={lfo2} onChange={(partial) => updateLFO('lfo2', partial)} />
      </div>

      <WorkstationSoftKeys />
      <WorkstationStatusBar message="LFO routing matrix ready" status="READY" />
    </div>
  );
}
