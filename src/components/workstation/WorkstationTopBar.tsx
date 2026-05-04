import { useMemo } from 'react';
import type { MeterSnapshot } from '../../types/synth';
import { factoryPresets } from '../../presets/factoryPresets';
import { sampleFactoryPresets } from '../../presets/sampleFactoryPresets';
import { getCachedSamplePreset } from '../../samples/sampleBankLibrary';
import { usePresetStore } from '../../store/presetStore';
import { selectEngineState, useSynthStore } from '../../store/synthStore';
import type { EngineMode } from '../../types/soundfont';
import { OutputMeter } from '../OutputMeter';

const engineModes: EngineMode[] = ['synth', 'sample', 'hybrid'];
const hardwareKnobs = [
  { number: '1', label: 'Cutoff' },
  { number: '2', label: 'Resonance' },
  { number: '3', label: 'EG Int' },
  { number: '4', label: 'EG Release' },
  { number: '5', label: 'Effect' },
  { number: '6', label: 'Reverb' },
];

const utilityButtons = ['Latch', 'ARP', 'Drum', 'Audio In', 'MFX', 'TFX'];
const quickAccessButtons = ['A', 'B', 'C', 'D', 'E', 'F'];

interface WorkstationTopBarProps {
  onPanic: () => void;
  onTestTone: () => void;
  meter: MeterSnapshot;
}

export function WorkstationTopBar({ onPanic, onTestTone, meter }: WorkstationTopBarProps) {
  const masterVolume = useSynthStore((state) => state.masterVolume);
  const bpm = useSynthStore((state) => state.bpm);
  const polyphony = useSynthStore((state) => state.polyphony);
  const currentPreset = useSynthStore((state) => state.currentPreset);
  const engineState = useSynthStore((state) => selectEngineState(state));
  const userPresets = usePresetStore((state) => state.userPresets);
  const setMasterVolume = useSynthStore((state) => state.setMasterVolume);
  const setBpm = useSynthStore((state) => state.setBpm);
  const setPolyphony = useSynthStore((state) => state.setPolyphony);
  const setEngineMode = useSynthStore((state) => state.setEngineMode);
  const loadPreset = useSynthStore((state) => state.loadPreset);
  const selectedPreset = useMemo(
    () => [...factoryPresets, ...sampleFactoryPresets, ...userPresets].find((preset) => preset.id === currentPreset),
    [currentPreset, userPresets],
  );
  const selectedSamplePreset = useMemo(
    () => getCachedSamplePreset(engineState.sampleLayer.bankId, engineState.sampleLayer.presetId) ?? undefined,
    [engineState.sampleLayer.bankId, engineState.sampleLayer.presetId],
  );
  const status = meter.audioState === 'suspended' ? 'Audio suspended' : meter.clipping ? 'Output clipping' : 'Ready';
  const setListPrograms = useMemo(() => [...factoryPresets, ...sampleFactoryPresets, ...userPresets].slice(0, 16), [userPresets]);
  const currentProgramName = selectedPreset?.name ?? selectedSamplePreset?.name ?? 'Init Program';
  const currentProgramMeta = selectedPreset
    ? `${selectedPreset.category} / ${selectedPreset.author}`
    : selectedSamplePreset
      ? `${selectedSamplePreset.category} sample / ${selectedSamplePreset.author}`
      : 'Manual engine buffer';

  return (
    <header className="command-panel workstation-topbar nautilus-inspired-top">
      <section className="nautilus-left-controls" aria-label="Performance controls">
        <label className="nautilus-master-fader">
          <span>Master Volume</span>
          <input type="range" min={0} max={1} step={0.01} value={masterVolume} onChange={(event) => setMasterVolume(Number(event.target.value))} aria-label="Master volume" />
          <strong>{Math.round(masterVolume * 100)}%</strong>
        </label>

        <div className="nautilus-brand-readout">
          <div className="brand-mark" aria-hidden="true">
            VV
          </div>
          <div>
            <div className="brand-name">VECTOR SAMPLE</div>
            <div className="brand-subtitle">WORKSTATION</div>
            <small>Hybrid Synth / Sample / FX</small>
          </div>
        </div>

        <div className="nautilus-knob-bank" aria-label="Realtime control knobs">
          {hardwareKnobs.map((knob) => (
            <div key={knob.number} className="nautilus-panel-knob">
              <span>{knob.number}</span>
              <i aria-hidden="true" />
              <strong>{knob.label}</strong>
            </div>
          ))}
        </div>

        <div className="nautilus-utility-buttons" aria-label="Performance switches">
          {utilityButtons.map((label) => (
            <button key={label} type="button" className="nautilus-mini-button">
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="nautilus-touchview" aria-label="Set list touch screen">
        <div className="nautilus-touchview-top">
          <span>SET LIST</span>
          <strong>{engineState.engineMode.toUpperCase()}</strong>
          <em>{status}</em>
        </div>
        <div className="nautilus-current-program">
          <span>000</span>
          <div>
            <h2>{currentProgramName}</h2>
            <p>{currentProgramMeta}</p>
          </div>
        </div>
        <div className="nautilus-setlist-grid" aria-label="Set list slots">
          {setListPrograms.map((preset, index) => (
            <button key={preset.id} type="button" className={preset.id === currentPreset ? 'nautilus-setlist-slot is-active' : 'nautilus-setlist-slot'} onClick={() => loadPreset(preset)}>
              <span>{String(index).padStart(2, '0')}</span>
              <strong>{preset.name}</strong>
              <em>{preset.category}</em>
            </button>
          ))}
        </div>
        <div className="nautilus-touchview-footer">
          <button type="button">Play</button>
          <button type="button">Mixer</button>
          <button type="button">EQ</button>
          <button type="button">ARP/Drum</button>
          <button type="button">Tone Adj</button>
        </div>
      </section>

      <section className="nautilus-right-controls" aria-label="Navigation and quick access">
        <div className="nautilus-encoder-area">
          <div className="nautilus-encoder" aria-hidden="true" />
          <div className="nautilus-inc-dec">
            <button type="button">-</button>
            <button type="button">+</button>
          </div>
          <div className="nautilus-enter-row">
            <button type="button">Exit</button>
            <button type="button">Enter</button>
          </div>
        </div>

        <div className="nautilus-quick-access" aria-label="Quick access buttons">
          <button type="button" className="nautilus-mini-button">Mode</button>
          <button type="button" className="nautilus-mini-button">Page</button>
          {quickAccessButtons.map((label) => (
            <button key={label} type="button" className="nautilus-mini-button">
              {label}
            </button>
          ))}
        </div>

        <div className="nautilus-system-strip">
          <label>
            <span>BPM</span>
            <input className="mini-input panel-input" type="number" min={40} max={240} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} />
          </label>
          <label>
            <span>Voices</span>
            <input className="mini-input panel-input" type="number" min={1} max={16} value={polyphony} onChange={(event) => setPolyphony(Number(event.target.value))} />
          </label>
          <button type="button" className="nautilus-panic-button" aria-label="Panic: stop all notes and clear active voices" onClick={onPanic}>
            Panic
          </button>
        </div>

        <nav className="workstation-engine-mode-strip" aria-label="Engine mode">
          {engineModes.map((mode) => {
            const active = engineState.engineMode === mode;
            return (
              <button key={mode} type="button" className={active ? 'engine-mode-button is-active' : 'engine-mode-button'} aria-pressed={active} onClick={() => setEngineMode(mode)}>
                {mode.toUpperCase()}
              </button>
            );
          })}
        </nav>

        <div className="nautilus-meter-wrap">
          <OutputMeter meter={meter} compact onTestTone={onTestTone} />
        </div>
      </section>
    </header>
  );
}
