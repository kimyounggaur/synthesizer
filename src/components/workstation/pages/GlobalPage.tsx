import type { EngineMode } from '../../../types/soundfont';
import { useSynthStore } from '../../../store/synthStore';
import { Knob } from '../../ui/Knob';
import { LedButton } from '../../ui/LedButton';
import { MiniDisplay } from '../../ui/MiniDisplay';
import { WorkstationBreadcrumb, WorkstationSoftKeys, WorkstationStatusBar } from '../WorkstationLCDChrome';

const engineModes: EngineMode[] = ['synth', 'sample', 'hybrid'];

interface GlobalPageProps {
  onPanic?: () => void;
}

type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function modeLabel(mode: EngineMode): string {
  return mode === 'synth' ? 'Synth' : mode === 'sample' ? 'Sample' : 'Hybrid';
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function GlobalPage({ onPanic }: GlobalPageProps) {
  const masterVolume = useSynthStore((state) => state.masterVolume);
  const polyphony = useSynthStore((state) => state.polyphony);
  const bpm = useSynthStore((state) => state.bpm);
  const keyboardOctave = useSynthStore((state) => state.keyboardOctave);
  const defaultVelocity = useSynthStore((state) => state.defaultVelocity);
  const engineMode = useSynthStore((state) => state.engineMode);
  const sampleLayer = useSynthStore((state) => state.sampleLayer);
  const setMasterVolume = useSynthStore((state) => state.setMasterVolume);
  const setPolyphony = useSynthStore((state) => state.setPolyphony);
  const setBpm = useSynthStore((state) => state.setBpm);
  const setKeyboardOctave = useSynthStore((state) => state.setKeyboardOctave);
  const setDefaultVelocity = useSynthStore((state) => state.setDefaultVelocity);
  const setEngineMode = useSynthStore((state) => state.setEngineMode);
  const updateSampleLayer = useSynthStore((state) => state.updateSampleLayer);
  const resetSynth = useSynthStore((state) => state.resetSynth);
  const hasWebAudio = Boolean(window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext);

  return (
    <div className="workstation-page workstation-lcd-page global-page">
      <header className="workstation-page-header">
        <MiniDisplay eyebrow="GLOBAL SETTINGS" value="SYSTEM" detail={`Mode ${modeLabel(engineMode)} / BPM ${bpm}`} tone="cyan" />
        <nav className="workstation-subtabs" aria-label="Global settings sections">
          <span className="workstation-subtab is-active">AUDIO</span>
          <span className="workstation-subtab">KEYBOARD</span>
          <span className="workstation-subtab">SYSTEM</span>
          <span className="workstation-subtab">ABOUT</span>
        </nav>
      </header>

      <WorkstationBreadcrumb items={['SYSTEM', 'GLOBAL SETTINGS', modeLabel(engineMode).toUpperCase()]} />

      <div className="workstation-page-grid global-page-grid">
        <section className="module-block module-block-mint workstation-card global-card">
          <MiniDisplay eyebrow="Audio" value="OUTPUT" detail={`Master ${formatPercent(masterVolume)} / ${polyphony} voices`} tone="mint" />
          <div className="global-audio-grid">
            <Knob label="Master" min={0} max={1} step={0.01} value={masterVolume} onChange={setMasterVolume} displayValue={formatPercent(masterVolume)} tone="mint" />
            <label className="compact-control workstation-select-control">
              <span className="control-label">Polyphony</span>
              <input className="mini-input panel-input" type="number" min={1} max={16} value={polyphony} onChange={(event) => setPolyphony(Number(event.target.value))} />
            </label>
            <label className="compact-control workstation-select-control">
              <span className="control-label">BPM</span>
              <input className="mini-input panel-input" type="number" min={40} max={240} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} />
            </label>
            <LedButton active={false} danger onClick={onPanic}>
              Panic
            </LedButton>
          </div>
        </section>

        <section className="module-block module-block-cyan workstation-card global-card">
          <MiniDisplay eyebrow="Keyboard" value={`OCT ${keyboardOctave}`} detail={`Velocity ${formatPercent(defaultVelocity)}`} tone="cyan" />
          <div className="global-keyboard-grid">
            <button type="button" className="soft-button global-hardware-button" onClick={() => setKeyboardOctave(keyboardOctave - 1)}>
              Oct -
            </button>
            <div className="performance-lcd">OCT {keyboardOctave}</div>
            <button type="button" className="soft-button global-hardware-button" onClick={() => setKeyboardOctave(keyboardOctave + 1)}>
              Oct +
            </button>
            <label className="compact-control global-velocity-control">
              <span className="control-label">Velocity</span>
              <input className="range" type="range" min={0.05} max={1} step={0.01} value={defaultVelocity} onChange={(event) => setDefaultVelocity(Number(event.target.value))} />
            </label>
          </div>
        </section>

        <section className="module-block module-block-violet workstation-card global-card">
          <MiniDisplay eyebrow="System" value={modeLabel(engineMode).toUpperCase()} detail={sampleLayer.preload ? 'Sample preload on' : 'Sample preload off'} tone="cyan" />
          <div className="global-engine-buttons" aria-label="Engine mode">
            {engineModes.map((mode) => (
              <button key={mode} type="button" className={engineMode === mode ? 'performance-button is-active' : 'performance-button'} onClick={() => setEngineMode(mode)}>
                <span className="workstation-led-dot is-small" />
                {modeLabel(mode)}
              </button>
            ))}
          </div>
          <div className="global-system-actions">
            <LedButton active={sampleLayer.preload} onClick={() => updateSampleLayer({ preload: !sampleLayer.preload })}>
              Preload
            </LedButton>
            <button type="button" className="soft-button global-hardware-button" onClick={resetSynth}>
              Reset Synth
            </button>
          </div>
        </section>

        <section className="module-block module-block-amber workstation-card global-card">
          <MiniDisplay eyebrow="About" value="WEB BUILD" detail={import.meta.env.BASE_URL} tone="amber" />
          <div className="global-about-list">
            <div className="global-status-row">
              <span>Web Audio API</span>
              <strong>{hasWebAudio ? 'Available' : 'Unavailable'}</strong>
            </div>
            <div className="global-status-row">
              <span>GitHub Pages build</span>
              <strong>{import.meta.env.BASE_URL}</strong>
            </div>
            <div className="global-status-row">
              <span>Runtime</span>
              <strong>{import.meta.env.MODE}</strong>
            </div>
          </div>
        </section>
      </div>

      <WorkstationSoftKeys />
      <WorkstationStatusBar message={hasWebAudio ? 'Web Audio API ready' : 'Web Audio API unavailable'} status={hasWebAudio ? 'READY' : 'AUDIO SUSPENDED'} />
    </div>
  );
}
