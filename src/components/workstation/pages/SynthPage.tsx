import { OscillatorPanel } from '../../OscillatorPanel';
import { WorkstationBreadcrumb, WorkstationPageTabs, WorkstationSoftKeys, WorkstationStatusBar } from '../WorkstationLCDChrome';

export function SynthPage() {
  return (
    <div className="workstation-page-panel">
      <header className="workstation-page-header">
        <div>
          <h2>SYNTH EDIT</h2>
          <p>OSC / MIX / SOURCE</p>
        </div>
        <WorkstationPageTabs labels={['OSC BASIC', 'SUB/NOISE', 'MIX']} ariaLabel="Oscillator edit sections" />
      </header>

      <WorkstationBreadcrumb items={['SYNTH', 'OSCILLATOR EDIT', 'OSC BASIC']} />
      <OscillatorPanel />
      <WorkstationSoftKeys />
      <WorkstationStatusBar message="Oscillator edit ready" status="READY" />
    </div>
  );
}
