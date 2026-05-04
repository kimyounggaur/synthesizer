import type { EnvelopeState, FilterKind } from '../../../types/synth';
import { useSynthStore } from '../../../store/synthStore';
import { Knob } from '../../ui/Knob';
import { MiniDisplay } from '../../ui/MiniDisplay';
import { WorkstationBreadcrumb, WorkstationSoftKeys, WorkstationStatusBar } from '../WorkstationLCDChrome';

const filterTypes: FilterKind[] = ['lowpass', 'highpass', 'bandpass', 'notch', 'ladder'];
const envelopeControls: Array<keyof EnvelopeState> = ['attack', 'decay', 'sustain', 'release'];

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatCutoff(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`;
}

function formatEnvelopeValue(key: keyof EnvelopeState, value: number): string {
  if (key === 'sustain') {
    return formatPercent(value);
  }

  return value >= 1 ? `${value.toFixed(2)}s` : `${Math.round(value * 1000)}ms`;
}

function envelopeLabel(key: keyof EnvelopeState): string {
  return key === 'attack' ? 'Attack' : key === 'decay' ? 'Decay' : key === 'sustain' ? 'Sustain' : 'Release';
}

function envelopePath(env: EnvelopeState): string {
  const attackX = 16 + Math.min(34, env.attack * 14);
  const decayX = attackX + 28;
  const sustainY = 88 - env.sustain * 58;
  const releaseX = Math.min(132, decayX + 24 + env.release * 9);

  return `M8 90 L${attackX.toFixed(1)} 18 L${decayX.toFixed(1)} ${sustainY.toFixed(1)} L96 ${sustainY.toFixed(1)} L${releaseX.toFixed(1)} 90`;
}

function EnvelopeGraph({ env, title, tone }: { env: EnvelopeState; title: string; tone: 'amber' | 'red' }) {
  return (
    <div className={`workstation-envelope-graph workstation-envelope-graph-${tone}`}>
      <div className="workstation-graph-label">{title}</div>
      <svg viewBox="0 0 140 100" role="img" aria-label={`${title} ADSR graph`}>
        <path className="workstation-graph-grid" d="M8 72 H132 M8 48 H132 M8 24 H132 M32 10 V92 M64 10 V92 M96 10 V92" />
        <path className="workstation-adsr-path" d={envelopePath(env)} />
      </svg>
    </div>
  );
}

function EnvelopeKnobs({
  title,
  env,
  tone,
  onChange,
}: {
  title: string;
  env: EnvelopeState;
  tone: 'amber' | 'violet';
  onChange: (partial: Partial<EnvelopeState>) => void;
}) {
  return (
    <section className="module-block module-block-amber workstation-card workstation-envelope-card">
      <MiniDisplay eyebrow={title} value="ADSR" detail={`A ${formatEnvelopeValue('attack', env.attack)} / R ${formatEnvelopeValue('release', env.release)}`} tone="amber" />
      <div className="workstation-knob-grid workstation-env-knobs">
        {envelopeControls.map((key) => (
          <Knob
            key={key}
            label={envelopeLabel(key)}
            min={key === 'sustain' ? 0 : 0.001}
            max={key === 'sustain' ? 1 : 4}
            step={key === 'sustain' ? 0.01 : 0.001}
            value={env[key]}
            onChange={(value) => onChange({ [key]: value })}
            displayValue={formatEnvelopeValue(key, env[key])}
            tone={key === 'sustain' ? 'amber' : tone}
          />
        ))}
      </div>
    </section>
  );
}

export function FilterAmpPage() {
  const filter = useSynthStore((state) => state.filter);
  const ampEnv = useSynthStore((state) => state.ampEnv);
  const filterEnv = useSynthStore((state) => state.filterEnv);
  const updateFilter = useSynthStore((state) => state.updateFilter);
  const updateEnvelope = useSynthStore((state) => state.updateEnvelope);
  const cutoffLabel = formatCutoff(filter.cutoff);
  const cutoffPosition = Math.min(92, Math.max(8, ((Math.log10(filter.cutoff) - Math.log10(24)) / (Math.log10(18000) - Math.log10(24))) * 84 + 8));

  return (
    <div className="workstation-page workstation-lcd-page filter-amp-page">
      <header className="workstation-page-header">
        <MiniDisplay eyebrow="FILTER / AMP" value={filter.type.toUpperCase()} detail={`Cutoff ${cutoffLabel}`} tone="amber" />
        <nav className="workstation-subtabs" aria-label="Filter and amp sections">
          <span className="workstation-subtab is-active">FILTER</span>
          <span className="workstation-subtab">AMP EG</span>
          <span className="workstation-subtab">FILTER EG</span>
        </nav>
      </header>

      <WorkstationBreadcrumb items={['SYNTH', 'FILTER / AMP', filter.type.toUpperCase()]} />

      <div className="workstation-page-grid filter-amp-visual-grid">
        <section className="module-block module-block-amber workstation-card filter-amp-curve-card">
          <div className="workstation-card-header">
            <MiniDisplay eyebrow="FILTER" value={filter.type.toUpperCase()} detail={`Res ${filter.resonance.toFixed(1)} / Drive ${formatPercent(filter.drive)}`} tone="amber" />
            <label className="compact-control workstation-select-control">
              <span className="control-label">Type</span>
              <select className="mini-select panel-select" value={filter.type} onChange={(event) => updateFilter({ type: event.target.value as FilterKind })}>
                {filterTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="filter-curve workstation-filter-curve">
            <span className="filter-curve-line" />
            <span className="filter-curve-dot" style={{ left: `${cutoffPosition}%` }} />
          </div>
        </section>

        <section className="module-block module-block-violet workstation-card filter-amp-graph-card">
          <MiniDisplay eyebrow="ENVELOPES" value="ADSR" detail={`Amp ${formatEnvelopeValue('attack', ampEnv.attack)} / Filter ${formatEnvelopeValue('attack', filterEnv.attack)}`} tone="red" />
          <div className="workstation-envelope-graphs">
            <EnvelopeGraph env={ampEnv} title="AMP EG" tone="amber" />
            <EnvelopeGraph env={filterEnv} title="FILTER EG" tone="red" />
          </div>
        </section>
      </div>

      <section className="module-block module-block-cyan workstation-card filter-amp-filter-knobs">
        <div className="workstation-knob-grid workstation-filter-knobs">
          <Knob label="Cutoff" min={24} max={18000} step={1} value={filter.cutoff} onChange={(value) => updateFilter({ cutoff: value })} displayValue={cutoffLabel} tone="amber" />
          <Knob label="Res" min={0.1} max={24} step={0.1} value={filter.resonance} onChange={(value) => updateFilter({ resonance: value })} tone="amber" />
          <Knob label="Drive" min={0} max={1} step={0.01} value={filter.drive} onChange={(value) => updateFilter({ drive: value })} displayValue={formatPercent(filter.drive)} tone="amber" />
          <Knob label="Key Track" min={0} max={1} step={0.01} value={filter.keyTracking} onChange={(value) => updateFilter({ keyTracking: value })} displayValue={formatPercent(filter.keyTracking)} tone="cyan" />
          <Knob label="Env Amt" min={-1} max={1} step={0.01} value={filter.envelopeAmount} onChange={(value) => updateFilter({ envelopeAmount: value })} displayValue={formatPercent(filter.envelopeAmount)} tone="cyan" />
        </div>
      </section>

      <div className="workstation-page-grid filter-amp-envelope-grid">
        <EnvelopeKnobs title="AMP EG" env={ampEnv} tone="violet" onChange={(partial) => updateEnvelope('ampEnv', partial)} />
        <EnvelopeKnobs title="FILTER EG" env={filterEnv} tone="violet" onChange={(partial) => updateEnvelope('filterEnv', partial)} />
      </div>

      <WorkstationSoftKeys />
      <WorkstationStatusBar message={`Filter cutoff ${cutoffLabel}`} status="READY" />
    </div>
  );
}
