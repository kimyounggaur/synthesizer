import { VectorMixerPanel } from '../../VectorMixerPanel';
import { WaveSequencerPanel } from '../../WaveSequencerPanel';
import { WorkstationBreadcrumb, WorkstationPageTabs, WorkstationSoftKeys, WorkstationStatusBar } from '../WorkstationLCDChrome';

export function WaveVectorPage() {
  return (
    <div className="workstation-page-panel">
      <header className="workstation-page-header">
        <div>
          <h2>WAVE / VECTOR</h2>
          <p>Vector mixing and wave sequencing use the existing panels.</p>
        </div>
        <WorkstationPageTabs labels={['VECTOR', 'WAVE SEQ', 'STEP DETAIL']} ariaLabel="Wave vector sections" />
      </header>

      <WorkstationBreadcrumb items={['SYNTH', 'WAVE / VECTOR', 'VECTOR']} />
      <div className="workstation-mvp-panel-grid">
        <VectorMixerPanel />
        <WaveSequencerPanel />
      </div>
      <WorkstationSoftKeys />
      <WorkstationStatusBar message="Wave and vector pages ready" status="READY" />
    </div>
  );
}
