import { useMemo } from 'react';
import type { MeterSnapshot } from '../../types/synth';
import { factoryPresets } from '../../presets/factoryPresets';
import { sampleFactoryPresets } from '../../presets/sampleFactoryPresets';
import { getCachedSamplePreset } from '../../samples/sampleBankLibrary';
import { usePresetStore } from '../../store/presetStore';
import { selectEngineState, useSynthStore } from '../../store/synthStore';
import { Knob } from '../ui/Knob';
import { LedButton } from '../ui/LedButton';
import { OutputMeter } from '../OutputMeter';
import { ProgramDisplay } from '../ProgramDisplay';

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
  const selectedPreset = useMemo(
    () => [...factoryPresets, ...sampleFactoryPresets, ...userPresets].find((preset) => preset.id === currentPreset),
    [currentPreset, userPresets],
  );
  const selectedSamplePreset = useMemo(
    () => getCachedSamplePreset(engineState.sampleLayer.bankId, engineState.sampleLayer.presetId) ?? undefined,
    [engineState.sampleLayer.bankId, engineState.sampleLayer.presetId],
  );
  const status = meter.audioState === 'suspended' ? 'Audio suspended' : meter.clipping ? 'Output clipping' : 'Ready';

  return (
    <header className="command-panel workstation-topbar">
      <div className="brand-plate workstation-brand-plate">
        <div className="brand-mark" aria-hidden="true">
          M
        </div>
        <div>
          <div className="brand-name">M-WAVE SMK-37</div>
          <div className="brand-subtitle">Elite Hybrid Synthesizer</div>
        </div>
      </div>

      <ProgramDisplay engine={engineState} preset={selectedPreset} samplePreset={selectedSamplePreset} status={status} />

      <OutputMeter meter={meter} compact onTestTone={onTestTone} />

      <div className="top-control-strip">
        <label className="compact-control">
          <span className="control-label">BPM</span>
          <input className="mini-input panel-input" type="number" min={40} max={240} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} />
        </label>

        <label className="compact-control">
          <span className="control-label">Voices</span>
          <input className="mini-input panel-input" type="number" min={1} max={16} value={polyphony} onChange={(event) => setPolyphony(Number(event.target.value))} />
        </label>

        <Knob label="Master" min={0} max={1} step={0.01} value={masterVolume} onChange={setMasterVolume} displayValue={`${Math.round(masterVolume * 100)}%`} tone="mint" />

        <div className="panic-stack">
          <LedButton active={meter.clipping} danger onClick={onPanic} ariaLabel="Panic: stop all notes and clear active voices">
            Panic
          </LedButton>
          <div className={`clip-indicator ${meter.clipping ? 'is-hot' : ''}`}>{meter.clipping ? 'CLIPPING' : 'READY'}</div>
        </div>
      </div>
    </header>
  );
}
