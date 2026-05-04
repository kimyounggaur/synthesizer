import { useState } from 'react';
import type { EngineMode } from '../../types/soundfont';
import { useSynthStore } from '../../store/synthStore';

const engineModes: EngineMode[] = ['synth', 'sample', 'hybrid'];

interface WorkstationPerformanceStripProps {
  onPanic: () => void;
  onTestTone: () => void;
}

function modeLabel(mode: EngineMode): string {
  return mode === 'synth' ? 'Synth' : mode === 'sample' ? 'Sample' : 'Hybrid';
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function WorkstationPerformanceStrip({ onPanic, onTestTone }: WorkstationPerformanceStripProps) {
  const [holdEnabled, setHoldEnabled] = useState(false);
  const keyboardOctave = useSynthStore((state) => state.keyboardOctave);
  const defaultVelocity = useSynthStore((state) => state.defaultVelocity);
  const engineMode = useSynthStore((state) => state.engineMode);
  const sampleLayer = useSynthStore((state) => state.sampleLayer);
  const setKeyboardOctave = useSynthStore((state) => state.setKeyboardOctave);
  const setDefaultVelocity = useSynthStore((state) => state.setDefaultVelocity);
  const setEngineMode = useSynthStore((state) => state.setEngineMode);
  const updateSampleLayer = useSynthStore((state) => state.updateSampleLayer);

  return (
    <section className="workstation-performance-strip" aria-label="Performance controls">
      <div className="performance-strip-section performance-octave-section">
        <button type="button" className="performance-button" onClick={() => setKeyboardOctave(keyboardOctave - 1)}>
          OCT -
        </button>
        <div className="performance-lcd">OCT {keyboardOctave}</div>
        <button type="button" className="performance-button" onClick={() => setKeyboardOctave(keyboardOctave + 1)}>
          OCT +
        </button>
      </div>

      <label className="performance-strip-section performance-velocity-section">
        <span className="control-label">Velocity</span>
        <input className="range" type="range" min={0.05} max={1} step={0.01} value={defaultVelocity} onChange={(event) => setDefaultVelocity(Number(event.target.value))} />
        <span className="performance-lcd">{formatPercent(defaultVelocity)}</span>
      </label>

      <div className="performance-strip-section performance-toggle-section">
        <button type="button" className={holdEnabled ? 'performance-button is-active' : 'performance-button'} aria-pressed={holdEnabled} onClick={() => setHoldEnabled((current) => !current)}>
          <span className="workstation-led-dot is-small" />
          HOLD
        </button>
        <button
          type="button"
          className={sampleLayer.enabled ? 'performance-button is-active' : 'performance-button'}
          aria-pressed={sampleLayer.enabled}
          onClick={() => updateSampleLayer({ enabled: !sampleLayer.enabled })}
        >
          <span className="workstation-led-dot is-small" />
          SAMPLE ON
        </button>
      </div>

      <div className="performance-strip-section performance-mode-section" aria-label="Engine mode">
        {engineModes.map((mode) => (
          <button key={mode} type="button" className={engineMode === mode ? 'performance-button is-active' : 'performance-button'} onClick={() => setEngineMode(mode)}>
            <span className="workstation-led-dot is-small" />
            {modeLabel(mode)}
          </button>
        ))}
      </div>

      <div className="performance-strip-section performance-action-section">
        <button type="button" className="performance-button" onClick={onTestTone}>
          TEST TONE
        </button>
        <button type="button" className="performance-button is-danger" aria-label="Panic: stop all notes and clear active voices" onClick={onPanic}>
          PANIC
        </button>
      </div>
    </section>
  );
}
