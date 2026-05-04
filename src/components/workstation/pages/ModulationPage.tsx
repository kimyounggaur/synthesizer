import { LFOPanel } from '../../LFOPanel';
import { WorkstationBreadcrumb, WorkstationPageTabs, WorkstationSoftKeys, WorkstationStatusBar } from '../WorkstationLCDChrome';

export function ModulationPage() {
  return (
    <div className="workstation-page-panel">
      <header className="workstation-page-header">
        <div>
          <h2>MODULATION</h2>
          <p>LFO routing is connected to the existing modulation panel.</p>
        </div>
        <WorkstationPageTabs labels={['LFO', 'ROUTING', 'SYNC']} ariaLabel="Modulation sections" />
      </header>

      <WorkstationBreadcrumb items={['SYNTH', 'MODULATION', 'LFO MATRIX']} />
      <LFOPanel />
      <WorkstationSoftKeys />
      <WorkstationStatusBar message="LFO panel ready" status="READY" />
    </div>
  );
}
