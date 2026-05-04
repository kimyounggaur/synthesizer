import type { MeterSnapshot } from '../../types/synth';
import { useUiStore } from '../../store/uiStore';
import { useSynthStore } from '../../store/synthStore';
import { MiniDisplay } from '../ui/MiniDisplay';
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
  const activeVoices = meter.activeVoices;
  const audioStatus = meter.audioState === 'suspended' ? 'AUDIO SUSPENDED' : meter.clipping ? 'CLIPPING' : 'READY';

  return (
    <aside className="workstation-parameter-rack workstation-system-rack" aria-label="Quick control rack">
      <section className="module-block module-block-cyan workstation-card">
        <MiniDisplay eyebrow="Touch Page" value={page.label.toUpperCase()} detail={page.detail} tone="cyan" />
        <div className="global-status-row">
          <span>Status</span>
          <strong>{audioStatus}</strong>
        </div>
        <div className="global-status-row">
          <span>Voices</span>
          <strong>{activeVoices}</strong>
        </div>
      </section>

      <section className="module-block module-block-mint workstation-card">
        <MiniDisplay eyebrow="Quick Control" value={engineMode.toUpperCase()} detail={sampleLayer.enabled ? 'Sample layer on' : 'Sample layer off'} tone="mint" />
        <div className="global-status-row">
          <span>Master</span>
          <strong>{formatPercent(masterVolume)}</strong>
        </div>
        <div className="global-status-row">
          <span>BPM</span>
          <strong>{bpm}</strong>
        </div>
        <div className="global-status-row">
          <span>Polyphony</span>
          <strong>{polyphony}</strong>
        </div>
      </section>

      <section className="module-block module-block-amber workstation-card">
        <MiniDisplay eyebrow="Utility" value="SAFE CTRL" detail="Test / panic" tone="amber" />
        <div className="workstation-rack-actions">
          <button type="button" className="soft-button global-hardware-button" onClick={onTestTone}>
            Test Tone
          </button>
          <button type="button" className="soft-button global-hardware-button is-danger" aria-label="Panic: stop all notes and clear active voices" onClick={onPanic}>
            Panic
          </button>
        </div>
      </section>
    </aside>
  );
}
