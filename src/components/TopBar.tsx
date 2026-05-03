import type { MeterSnapshot } from '../types/synth';
import { useSynthStore } from '../store/synthStore';

interface TopBarProps {
  onPanic: () => void;
  meter: MeterSnapshot;
}

export function TopBar({ onPanic, meter }: TopBarProps) {
  const masterVolume = useSynthStore((state) => state.masterVolume);
  const bpm = useSynthStore((state) => state.bpm);
  const polyphony = useSynthStore((state) => state.polyphony);
  const currentPreset = useSynthStore((state) => state.currentPreset);
  const setMasterVolume = useSynthStore((state) => state.setMasterVolume);
  const setBpm = useSynthStore((state) => state.setBpm);
  const setPolyphony = useSynthStore((state) => state.setPolyphony);

  return (
    <header className="panel grid gap-3 p-3 lg:grid-cols-[minmax(220px,1fr)_160px_180px_170px_96px] lg:items-center">
      <div className="lcd min-h-14 px-4 py-3">
        <div className="font-mono text-xs uppercase tracking-widest text-synth-mint/80">Wave Vector Hybrid</div>
        <div className="truncate font-mono text-lg text-synth-mint">{currentPreset ?? 'Manual Patch'}</div>
      </div>

      <label className="grid gap-1">
        <span className="control-label">BPM</span>
        <input
          className="mini-input"
          type="number"
          min={40}
          max={240}
          value={bpm}
          onChange={(event) => setBpm(Number(event.target.value))}
        />
      </label>

      <label className="grid gap-1">
        <span className="control-label">Polyphony</span>
        <input
          className="mini-input"
          type="number"
          min={1}
          max={16}
          value={polyphony}
          onChange={(event) => setPolyphony(Number(event.target.value))}
        />
      </label>

      <label className="grid gap-1">
        <span className="control-label">Master</span>
        <input
          className="range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(event) => setMasterVolume(Number(event.target.value))}
        />
        <span className="font-mono text-xs text-slate-400">{Math.round(masterVolume * 100)}%</span>
      </label>

      <button className={`soft-button panic-button ${meter.clipping ? 'border-red-400 text-red-200' : ''}`} onClick={onPanic}>
        Panic
      </button>
    </header>
  );
}
