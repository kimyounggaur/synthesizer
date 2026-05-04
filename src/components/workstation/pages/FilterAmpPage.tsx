import { EnvelopePanel } from '../../EnvelopePanel';
import { FilterPanel } from '../../FilterPanel';
import { WorkstationBreadcrumb, WorkstationPageTabs, WorkstationSoftKeys, WorkstationStatusBar } from '../WorkstationLCDChrome';

export function FilterAmpPage() {
  return (
    <div className="workstation-page-panel">
      <header className="workstation-page-header">
        <div>
          <h2>FILTER / AMP</h2>
          <p>Filter and envelope editing use the existing panels.</p>
        </div>
        <WorkstationPageTabs labels={['FILTER', 'AMP EG', 'FILTER EG']} ariaLabel="Filter and amp sections" />
      </header>

      <WorkstationBreadcrumb items={['SYNTH', 'FILTER / AMP', 'FILTER']} />
      <div className="workstation-mvp-panel-grid">
        <FilterPanel />
        <EnvelopePanel />
      </div>
      <WorkstationSoftKeys />
      <WorkstationStatusBar message="Filter and envelope panels ready" status="READY" />
    </div>
  );
}
