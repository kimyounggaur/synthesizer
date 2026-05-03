import type { FilterKind } from '../types/synth';
import { useSynthStore } from '../store/synthStore';
import { Knob } from './ui/Knob';
import { MiniDisplay } from './ui/MiniDisplay';
import { SectionPanel } from './ui/SectionPanel';

const filterTypes: FilterKind[] = ['lowpass', 'highpass', 'bandpass', 'notch', 'ladder'];

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function FilterPanel() {
  const filter = useSynthStore((state) => state.filter);
  const updateFilter = useSynthStore((state) => state.updateFilter);
  const cutoffLabel = filter.cutoff >= 1000 ? `${(filter.cutoff / 1000).toFixed(1)} kHz` : `${Math.round(filter.cutoff)} Hz`;

  return (
    <SectionPanel title="Filter" eyebrow="VCF section" accent="amber" className="filter-panel">
      <div className="filter-panel-grid">
        <div className="module-block module-block-amber filter-display-block">
          <MiniDisplay eyebrow="Filter model" value={filter.type.toUpperCase()} detail={`Cutoff ${cutoffLabel}`} tone="amber" />
          <label className="compact-control">
            <span className="control-label">Type</span>
            <select className="mini-select panel-select" value={filter.type} onChange={(event) => updateFilter({ type: event.target.value as FilterKind })}>
              {filterTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-curve">
            <span className="filter-curve-line" />
            <span className="filter-curve-dot" style={{ left: `${Math.min(92, Math.max(8, (Math.log10(filter.cutoff) - Math.log10(24)) / (Math.log10(18000) - Math.log10(24)) * 84 + 8))}%` }} />
          </div>
        </div>

        <div className="module-block module-block-cyan filter-knob-bank">
          <div className="knob-grid knob-grid-filter">
            <Knob label="Cutoff" min={24} max={18000} step={1} value={filter.cutoff} onChange={(value) => updateFilter({ cutoff: value })} displayValue={cutoffLabel} tone="amber" />
            <Knob label="Res" min={0.1} max={24} step={0.1} value={filter.resonance} onChange={(value) => updateFilter({ resonance: value })} tone="amber" />
            <Knob label="Drive" min={0} max={1} step={0.01} value={filter.drive} onChange={(value) => updateFilter({ drive: value })} displayValue={formatPercent(filter.drive)} tone="amber" />
            <Knob
              label="Key"
              min={0}
              max={1}
              step={0.01}
              value={filter.keyTracking}
              onChange={(value) => updateFilter({ keyTracking: value })}
              displayValue={formatPercent(filter.keyTracking)}
              tone="cyan"
            />
            <Knob
              label="Env"
              min={-1}
              max={1}
              step={0.01}
              value={filter.envelopeAmount}
              onChange={(value) => updateFilter({ envelopeAmount: value })}
              displayValue={`${Math.round(filter.envelopeAmount * 100)}%`}
              tone="cyan"
            />
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}
