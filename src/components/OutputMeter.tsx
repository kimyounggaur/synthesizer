import type { MeterSnapshot } from '../types/synth';

interface OutputMeterProps {
  meter: MeterSnapshot;
}

export function OutputMeter({ meter }: OutputMeterProps) {
  const peak = Math.min(100, meter.peak * 100);
  const rms = Math.min(100, meter.rms * 160);

  return (
    <section className="panel grid gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="panel-title">Output</h2>
        <span className={`font-mono text-xs ${meter.clipping ? 'text-red-300' : 'text-slate-500'}`}>{meter.clipping ? 'CLIP' : 'OK'}</span>
      </div>
      <div className="grid gap-3">
        <div className="grid gap-1">
          <div className="control-label">Peak</div>
          <div className="h-5 overflow-hidden rounded bg-black/50 ring-1 ring-slate-700/70">
            <div className="h-full bg-gradient-to-r from-synth-mint via-synth-amber to-red-400" style={{ width: `${peak}%` }} />
          </div>
        </div>
        <div className="grid gap-1">
          <div className="control-label">RMS</div>
          <div className="h-5 overflow-hidden rounded bg-black/50 ring-1 ring-slate-700/70">
            <div className="h-full bg-gradient-to-r from-synth-cyan to-synth-violet" style={{ width: `${rms}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}
