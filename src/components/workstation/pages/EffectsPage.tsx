import { EffectsPanel } from '../../EffectsPanel';
import { WorkstationBreadcrumb, WorkstationPageTabs, WorkstationSoftKeys, WorkstationStatusBar } from '../WorkstationLCDChrome';

export function EffectsPage() {
  return (
    <div className="workstation-page-panel">
      <header className="workstation-page-header">
        <div>
          <h2>EFFECTS</h2>
          <p>IFX / MFX / CHAIN</p>
        </div>
        <WorkstationPageTabs labels={['INSERT FX', 'MASTER FX', 'CHAIN']} ariaLabel="Effects sections" />
      </header>

      <WorkstationBreadcrumb items={['SYNTH', 'EFFECTS', 'INSERT FX']} />
      <EffectsPanel />
      <WorkstationSoftKeys />
      <WorkstationStatusBar message="Effects page ready" status="READY" />
    </div>
  );
}
