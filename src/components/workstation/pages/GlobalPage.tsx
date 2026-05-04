import { useSynthStore } from '../../../store/synthStore';
import { WorkstationBreadcrumb, WorkstationPageTabs, WorkstationSoftKeys, WorkstationStatusBar } from '../WorkstationLCDChrome';

interface GlobalPageProps {
  onPanic?: () => void;
}

export function GlobalPage({ onPanic }: GlobalPageProps) {
  const resetSynth = useSynthStore((state) => state.resetSynth);

  return (
    <div className="workstation-page-panel">
      <header className="workstation-page-header">
        <div>
          <h2>GLOBAL SETTINGS</h2>
          <p>AUDIO / KEYBOARD / SYSTEM</p>
        </div>
        <WorkstationPageTabs labels={['AUDIO', 'KEYBOARD', 'SYSTEM', 'ABOUT']} ariaLabel="Global settings sections" />
      </header>

      <WorkstationBreadcrumb items={['SYSTEM', 'GLOBAL SETTINGS', 'MVP']} />
      <div className="workstation-placeholder-actions">
        <button type="button" className="soft-button global-hardware-button" onClick={resetSynth}>
          Reset Synth
        </button>
        <button type="button" className="soft-button global-hardware-button is-danger" aria-label="Panic: stop all notes and clear active voices" onClick={onPanic}>
          Panic
        </button>
      </div>
      <WorkstationSoftKeys />
      <WorkstationStatusBar message="Global placeholder ready" status="READY" />
    </div>
  );
}
