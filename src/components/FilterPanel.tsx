import type { FilterKind } from '../types/synth';
import { useSynthStore } from '../store/synthStore';

const filterTypes: FilterKind[] = ['lowpass', 'highpass', 'bandpass', 'notch', 'ladder'];

function RangeControl({
  label,
  min,
  max,
  step,
  value,
  suffix = '',
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="control-label">{label}</span>
      <input className="range" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="font-mono text-xs text-slate-400">
        {value >= 100 ? Math.round(value) : value.toFixed(2)}
        {suffix}
      </span>
    </label>
  );
}

export function FilterPanel() {
  const filter = useSynthStore((state) => state.filter);
  const updateFilter = useSynthStore((state) => state.updateFilter);

  return (
    <section className="panel grid gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="panel-title">Filter</h2>
        <div className="h-2 w-16 rounded-full bg-gradient-to-r from-synth-cyan to-synth-amber" />
      </div>

      <label className="grid gap-1">
        <span className="control-label">Type</span>
        <select className="mini-select" value={filter.type} onChange={(event) => updateFilter({ type: event.target.value as FilterKind })}>
          {filterTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <RangeControl label="Cutoff" min={24} max={18000} step={1} value={filter.cutoff} suffix=" Hz" onChange={(value) => updateFilter({ cutoff: value })} />
      <RangeControl label="Resonance" min={0.1} max={24} step={0.1} value={filter.resonance} onChange={(value) => updateFilter({ resonance: value })} />
      <RangeControl label="Drive" min={0} max={1} step={0.01} value={filter.drive} onChange={(value) => updateFilter({ drive: value })} />
      <RangeControl label="Key Track" min={0} max={1} step={0.01} value={filter.keyTracking} onChange={(value) => updateFilter({ keyTracking: value })} />
      <RangeControl label="Env Amt" min={-1} max={1} step={0.01} value={filter.envelopeAmount} onChange={(value) => updateFilter({ envelopeAmount: value })} />
    </section>
  );
}
