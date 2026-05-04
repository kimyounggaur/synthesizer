import { useMemo, useState, type PointerEvent } from 'react';
import { VectorMixer } from '../../../audio/VectorMixer';
import type { SynthWaveform } from '../../../types/synth';
import { useSynthStore } from '../../../store/synthStore';
import { Knob } from '../../ui/Knob';
import { LedButton } from '../../ui/LedButton';
import { MiniDisplay } from '../../ui/MiniDisplay';

const waveforms: SynthWaveform[] = ['sine', 'square', 'sawtooth', 'triangle', 'pulse', 'wavetable'];

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function WaveVectorPage() {
  const [selectedStep, setSelectedStep] = useState(0);
  const vectorMixer = useSynthStore((state) => state.vectorMixer);
  const waveSequencer = useSynthStore((state) => state.waveSequencer);
  const updateVectorPosition = useSynthStore((state) => state.updateVectorPosition);
  const updateWaveSequencer = useSynthStore((state) => state.updateWaveSequencer);
  const updateWaveStep = useSynthStore((state) => state.updateWaveStep);
  const weights = VectorMixer.calculateWeights(vectorMixer.x, vectorMixer.y);
  const step = waveSequencer.steps[selectedStep] ?? waveSequencer.steps[0];
  const activeSteps = useMemo(() => waveSequencer.steps.filter((item) => !item.skip).length, [waveSequencer.steps]);

  const updateVectorFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height));
    updateVectorPosition({ x, y });
  };

  if (!step) {
    return null;
  }

  return (
    <div className="workstation-page workstation-lcd-page wave-vector-page">
      <header className="workstation-page-header">
        <MiniDisplay eyebrow="WAVE / VECTOR" value={waveSequencer.enabled ? 'RUNNING' : 'STANDBY'} detail={`${activeSteps} active steps / X ${formatPercent(vectorMixer.x)}`} tone="mint" />
        <nav className="workstation-subtabs" aria-label="Wave vector sections">
          <span className="workstation-subtab is-active">VECTOR</span>
          <span className="workstation-subtab">WAVE SEQ</span>
          <span className="workstation-subtab">STEP DETAIL</span>
        </nav>
      </header>

      <div className="wave-vector-layout">
        <section className="module-block module-block-mint workstation-card wave-vector-pad-card">
          <div className="workstation-card-header">
            <MiniDisplay eyebrow="Vector XY Pad" value={`X ${formatPercent(vectorMixer.x)}`} detail={`Y ${formatPercent(vectorMixer.y)}`} tone="mint" />
            <div className="vector-weight-grid wave-vector-weights">
              <span>A {formatPercent(weights.a)}</span>
              <span>B {formatPercent(weights.b)}</span>
              <span>SUB {formatPercent(weights.c)}</span>
              <span>NOISE {formatPercent(weights.d)}</span>
            </div>
          </div>

          <div
            className="vector-pad workstation-vector-pad"
            role="slider"
            tabIndex={0}
            aria-label="Vector XY Pad"
            aria-valuetext={`X ${formatPercent(vectorMixer.x)}, Y ${formatPercent(vectorMixer.y)}`}
            onPointerDown={(event) => {
              updateVectorFromPointer(event);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                updateVectorFromPointer(event);
              }
            }}
            onKeyDown={(event) => {
              const stepSize = event.shiftKey ? 0.1 : 0.02;
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                updateVectorPosition({ x: Math.max(0, vectorMixer.x - stepSize) });
              }
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                updateVectorPosition({ x: Math.min(1, vectorMixer.x + stepSize) });
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                updateVectorPosition({ y: Math.max(0, vectorMixer.y - stepSize) });
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                updateVectorPosition({ y: Math.min(1, vectorMixer.y + stepSize) });
              }
            }}
          >
            <span className="vector-axis vector-axis-x" />
            <span className="vector-axis vector-axis-y" />
            <span className="vector-corner vector-corner-a">A</span>
            <span className="vector-corner vector-corner-b">B</span>
            <span className="vector-corner vector-corner-c">SUB</span>
            <span className="vector-corner vector-corner-d">NOISE</span>
            <span className="vector-cursor" style={{ left: `${vectorMixer.x * 100}%`, top: `${(1 - vectorMixer.y) * 100}%` }} />
          </div>

          <div className="workstation-knob-grid wave-vector-mix-knobs">
            <Knob label="X Mix" min={0} max={1} step={0.01} value={vectorMixer.x} onChange={(value) => updateVectorPosition({ x: value })} displayValue={formatPercent(vectorMixer.x)} tone="mint" />
            <Knob label="Y Mix" min={0} max={1} step={0.01} value={vectorMixer.y} onChange={(value) => updateVectorPosition({ y: value })} displayValue={formatPercent(vectorMixer.y)} tone="mint" />
          </div>
        </section>

        <section className="module-block module-block-cyan workstation-card wave-vector-lane-card">
          <div className="workstation-card-header">
            <MiniDisplay eyebrow="Wave Sequence 16-step lane" value={waveSequencer.enabled ? 'RUN' : 'STOP'} detail={waveSequencer.tempoSync ? 'Tempo sync on' : 'Free time'} tone="cyan" />
            <div className="wave-seq-actions">
              <LedButton active={waveSequencer.enabled} onClick={() => updateWaveSequencer({ enabled: !waveSequencer.enabled })}>
                Run
              </LedButton>
              <LedButton active={waveSequencer.tempoSync} onClick={() => updateWaveSequencer({ tempoSync: !waveSequencer.tempoSync })}>
                Sync
              </LedButton>
            </div>
          </div>

          <div className="wave-step-grid workstation-wave-lane">
            {waveSequencer.steps.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`wave-step-button ${selectedStep === index ? 'is-selected' : ''} ${item.skip ? 'is-muted' : ''}`}
                onClick={() => setSelectedStep(index)}
              >
                <span>{index + 1}</span>
                <span>{item.waveform.slice(0, 3)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="module-block module-block-violet workstation-card wave-vector-step-card">
          <MiniDisplay eyebrow={`Step Detail ${selectedStep + 1}`} value={step.waveform.toUpperCase()} detail={`Pitch ${step.pitchOffset} / ${formatPercent(step.level)}`} tone="mint" />

          <label className="compact-control workstation-select-control">
            <span className="control-label">Waveform</span>
            <select className="mini-select panel-select" value={step.waveform} onChange={(event) => updateWaveStep(selectedStep, { waveform: event.target.value as SynthWaveform })}>
              {waveforms.map((waveform) => (
                <option key={waveform} value={waveform}>
                  {waveform}
                </option>
              ))}
            </select>
          </label>

          <div className="wave-seq-actions">
            <LedButton active={step.skip} onClick={() => updateWaveStep(selectedStep, { skip: !step.skip })}>
              Skip
            </LedButton>
            <LedButton active={step.reverse} onClick={() => updateWaveStep(selectedStep, { reverse: !step.reverse })}>
              Rev
            </LedButton>
            <LedButton active={step.repeat} onClick={() => updateWaveStep(selectedStep, { repeat: !step.repeat })}>
              Loop
            </LedButton>
          </div>

          <div className="workstation-knob-grid wave-vector-step-knobs">
            <Knob label="Pitch" min={-24} max={24} step={1} value={step.pitchOffset} onChange={(value) => updateWaveStep(selectedStep, { pitchOffset: value })} tone="violet" />
            <Knob label="Level" min={0} max={1} step={0.01} value={step.level} onChange={(value) => updateWaveStep(selectedStep, { level: value })} displayValue={formatPercent(step.level)} tone="cyan" />
            <Knob label="Pan" min={-1} max={1} step={0.01} value={step.pan} onChange={(value) => updateWaveStep(selectedStep, { pan: value })} displayValue={formatPercent((step.pan + 1) / 2)} tone="mint" />
            <Knob label="Time" min={40} max={1200} step={10} value={step.duration} onChange={(value) => updateWaveStep(selectedStep, { duration: value })} displayValue={`${Math.round(step.duration)}ms`} tone="mint" />
            <Knob label="XFade" min={0} max={400} step={5} value={step.crossfade} onChange={(value) => updateWaveStep(selectedStep, { crossfade: value })} displayValue={`${Math.round(step.crossfade)}ms`} tone="violet" />
          </div>
        </section>
      </div>
    </div>
  );
}
