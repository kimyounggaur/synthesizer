import type { MeterSnapshot } from '../../types/synth';
import { useUiStore } from '../../store/uiStore';
import { useSynthStore } from '../../store/synthStore';
import { Knob } from '../ui/Knob';
import { workstationPages } from './workstationPages';

interface WorkstationParameterRackProps {
  meter: MeterSnapshot;
  onPanic: () => void;
  onTestTone: () => void;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function WorkstationParameterRack({ meter, onPanic, onTestTone }: WorkstationParameterRackProps) {
  const activePage = useUiStore((state) => state.activeWorkstationPage);
  const page = workstationPages.find((item) => item.id === activePage) ?? workstationPages[0];
  const engineMode = useSynthStore((state) => state.engineMode);
  const sampleLayer = useSynthStore((state) => state.sampleLayer);
  const masterVolume = useSynthStore((state) => state.masterVolume);
  const bpm = useSynthStore((state) => state.bpm);
  const polyphony = useSynthStore((state) => state.polyphony);
  const defaultVelocity = useSynthStore((state) => state.defaultVelocity);
  const setMasterVolume = useSynthStore((state) => state.setMasterVolume);
  const setBpm = useSynthStore((state) => state.setBpm);
  const setPolyphony = useSynthStore((state) => state.setPolyphony);
  const setDefaultVelocity = useSynthStore((state) => state.setDefaultVelocity);
  const activeVoices = meter.activeVoices;
  const audioStatus = meter.audioState === 'suspended' ? 'AUDIO SUSPENDED' : meter.clipping ? 'CLIPPING' : 'READY';

  return (
    <aside className="workstation-parameter-rack workstation-system-rack nautilus-parameter-rack" aria-label="Quick control rack">
      <div className="nautilus-rack-header">
        <span>Parameter Rack</span>
        <strong>{page.label.slice(0, 4).toUpperCase()}</strong>
      </div>

      <section className="nautilus-rack-panel">
        <div className="nautilus-rack-lcd">
          <span>Quick Control</span>
          <strong>{engineMode.toUpperCase()}</strong>
          <em>{sampleLayer.enabled ? 'SAMPLE LAYER ON' : 'SAMPLE LAYER OFF'}</em>
        </div>

        <div className="nautilus-rack-knob-grid">
          <Knob label="Master" min={0} max={1} step={0.01} value={masterVolume} onChange={setMasterVolume} displayValue={formatPercent(masterVolume)} tone="cyan" />
          <Knob label="BPM" min={40} max={240} step={1} value={bpm} onChange={setBpm} displayValue={String(bpm)} tone="violet" />
          <Knob label="Voices" min={1} max={16} step={1} value={polyphony} onChange={setPolyphony} displayValue={String(polyphony)} tone="mint" />
          <Knob label="Velocity" min={0.05} max={1} step={0.01} value={defaultVelocity} onChange={setDefaultVelocity} displayValue={formatPercent(defaultVelocity)} tone="amber" />
        </div>

        <div className="nautilus-rack-status">
          <span>{audioStatus}</span>
          <strong>{activeVoices} VOICES</strong>
        </div>

        <div className="workstation-rack-actions">
          <button type="button" className="nautilus-mini-button" onClick={onTestTone}>
            Test Tone
          </button>
          <button type="button" className="nautilus-mini-button is-danger" aria-label="Panic: stop all notes and clear active voices" onClick={onPanic}>
            Panic
          </button>
        </div>
      </section>
    </aside>
  );
}
