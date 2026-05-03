import type { MeterSnapshot } from '../types/synth';
import { useSynthStore } from '../store/synthStore';
import { Knob } from './ui/Knob';
import { LedButton } from './ui/LedButton';
import { MiniDisplay } from './ui/MiniDisplay';

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
    <header className="command-panel">
      <div className="brand-plate">
        <div className="brand-mark">WV</div>
        <div>
          <div className="brand-name">Wave Vector Hybrid</div>
          <div className="brand-subtitle">Performance Synthesizer</div>
        </div>
      </div>

      <MiniDisplay
        eyebrow="Program"
        value={currentPreset ?? 'Manual Patch'}
        detail={meter.clipping ? 'Output clipping' : 'Ready'}
        tone={meter.clipping ? 'red' : 'mint'}
        className="min-h-[78px]"
      />

      <div className="top-control-strip">
        <label className="compact-control">
          <span className="control-label">BPM</span>
          <input
            className="mini-input panel-input"
            type="number"
            min={40}
            max={240}
            value={bpm}
            onChange={(event) => setBpm(Number(event.target.value))}
          />
        </label>

        <label className="compact-control">
          <span className="control-label">Voices</span>
          <input
            className="mini-input panel-input"
            type="number"
            min={1}
            max={16}
            value={polyphony}
            onChange={(event) => setPolyphony(Number(event.target.value))}
          />
        </label>

        <Knob
          label="Master"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={setMasterVolume}
          displayValue={`${Math.round(masterVolume * 100)}%`}
          tone="mint"
        />

        <div className="panic-stack">
          <LedButton active={meter.clipping} danger onClick={onPanic}>
            Panic
          </LedButton>
          <div className={`clip-indicator ${meter.clipping ? 'is-hot' : ''}`}>{meter.clipping ? 'CLIP' : 'SIGNAL OK'}</div>
        </div>
      </div>
    </header>
  );
}
