import { useMemo, useState } from 'react';
import type { SynthWaveform } from '../types/synth';
import { useSynthStore } from '../store/synthStore';
import { Knob } from './ui/Knob';
import { LedButton } from './ui/LedButton';
import { MiniDisplay } from './ui/MiniDisplay';
import { SectionPanel } from './ui/SectionPanel';

const waveforms: SynthWaveform[] = ['sine', 'square', 'sawtooth', 'triangle', 'pulse', 'wavetable'];

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function WaveSequencerPanel() {
  const [selectedStep, setSelectedStep] = useState(0);
  const waveSequencer = useSynthStore((state) => state.waveSequencer);
  const updateWaveSequencer = useSynthStore((state) => state.updateWaveSequencer);
  const updateWaveStep = useSynthStore((state) => state.updateWaveStep);
  const step = waveSequencer.steps[selectedStep] ?? waveSequencer.steps[0];
  const enabledCount = useMemo(() => waveSequencer.steps.filter((item) => !item.skip).length, [waveSequencer.steps]);

  if (!step) {
    return null;
  }

  return (
    <SectionPanel
      title="Wave Seq"
      eyebrow="Step oscillator motion"
      accent="cyan"
      className="wave-sequencer-panel"
      actions={
        <LedButton active={waveSequencer.enabled} onClick={() => updateWaveSequencer({ enabled: !waveSequencer.enabled })}>
          Run
        </LedButton>
      }
    >
      <div className="wave-seq-grid">
        <div className="module-block module-block-cyan">
          <MiniDisplay eyebrow="Sequencer" value={waveSequencer.enabled ? 'RUNNING' : 'STANDBY'} detail={`${enabledCount} active steps`} tone="cyan" />
          <div className="wave-step-grid">
            {waveSequencer.steps.map((item, index) => (
              <button
                key={item.id}
                className={`wave-step-button ${selectedStep === index ? 'is-selected' : ''} ${item.skip ? 'is-muted' : ''}`}
                onClick={() => setSelectedStep(index)}
              >
                <span>{index + 1}</span>
                <span>{item.waveform.slice(0, 3)}</span>
              </button>
            ))}
          </div>
          <div className="wave-seq-actions">
            <LedButton active={waveSequencer.tempoSync} onClick={() => updateWaveSequencer({ tempoSync: !waveSequencer.tempoSync })}>
              Sync
            </LedButton>
            <LedButton active={step.skip} onClick={() => updateWaveStep(selectedStep, { skip: !step.skip })}>
              Skip
            </LedButton>
            <LedButton active={step.reverse} onClick={() => updateWaveStep(selectedStep, { reverse: !step.reverse })}>
              Rev
            </LedButton>
          </div>
        </div>

        <div className="module-block module-block-violet">
          <MiniDisplay eyebrow={`Step ${selectedStep + 1}`} value={step.waveform.toUpperCase()} detail={`Pitch ${step.pitchOffset} / ${formatPercent(step.level)}`} tone="mint" />
          <label className="compact-control">
            <span className="control-label">Wave</span>
            <select className="mini-select panel-select" value={step.waveform} onChange={(event) => updateWaveStep(selectedStep, { waveform: event.target.value as SynthWaveform })}>
              {waveforms.map((waveform) => (
                <option key={waveform} value={waveform}>
                  {waveform}
                </option>
              ))}
            </select>
          </label>
          <div className="knob-grid knob-grid-four">
            <Knob label="Pitch" min={-24} max={24} step={1} value={step.pitchOffset} onChange={(value) => updateWaveStep(selectedStep, { pitchOffset: value })} tone="violet" />
            <Knob label="Level" min={0} max={1} step={0.01} value={step.level} onChange={(value) => updateWaveStep(selectedStep, { level: value })} displayValue={formatPercent(step.level)} tone="cyan" />
            <Knob label="Time" min={40} max={1200} step={10} value={step.duration} onChange={(value) => updateWaveStep(selectedStep, { duration: value })} displayValue={`${Math.round(step.duration)}ms`} tone="mint" />
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}
