import { useState } from 'react';
import type { EffectState, EffectType } from '../types/synth';
import { useSynthStore } from '../store/synthStore';
import { createId } from '../utils/audioMath';
import { Knob } from './ui/Knob';
import { LedButton } from './ui/LedButton';
import { MiniDisplay } from './ui/MiniDisplay';
import { SectionPanel } from './ui/SectionPanel';

const effectTypes: EffectType[] = ['delay', 'reverb', 'distortion', 'chorus', 'flanger', 'phaser', 'compressor', 'eq', 'bitcrusher', 'autoPan'];

const defaultParams: Record<EffectType, Record<string, number>> = {
  chorus: { time: 0.026, feedback: 0.18 },
  phaser: { frequency: 720, q: 5 },
  flanger: { time: 0.012, feedback: 0.52 },
  delay: { time: 0.28, feedback: 0.32 },
  reverb: { decay: 1.7 },
  distortion: { drive: 0.44 },
  compressor: { threshold: -22, ratio: 4 },
  eq: { frequency: 1200, q: 1.2, gain: 4 },
  bitcrusher: { drive: 0.32 },
  autoPan: { rate: 0.45, depth: 0.7 },
};

const paramRanges: Record<string, { min: number; max: number; step: number; label: string; format?: (value: number) => string }> = {
  time: { min: 0.002, max: 1.2, step: 0.001, label: 'Time', format: (value) => `${Math.round(value * 1000)}ms` },
  feedback: { min: 0, max: 0.86, step: 0.01, label: 'Feed', format: (value) => `${Math.round(value * 100)}%` },
  decay: { min: 0.2, max: 5, step: 0.01, label: 'Decay', format: (value) => `${value.toFixed(1)}s` },
  drive: { min: 0, max: 1, step: 0.01, label: 'Drive', format: (value) => `${Math.round(value * 100)}%` },
  frequency: { min: 60, max: 8000, step: 1, label: 'Freq', format: (value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${Math.round(value)}`) },
  q: { min: 0.1, max: 16, step: 0.1, label: 'Q' },
  gain: { min: -12, max: 12, step: 0.1, label: 'Gain', format: (value) => `${value.toFixed(1)}dB` },
  threshold: { min: -60, max: 0, step: 1, label: 'Thresh', format: (value) => `${Math.round(value)}dB` },
  ratio: { min: 1, max: 20, step: 0.1, label: 'Ratio' },
  rate: { min: 0.01, max: 12, step: 0.01, label: 'Rate', format: (value) => `${value.toFixed(2)}Hz` },
  depth: { min: 0, max: 1, step: 0.01, label: 'Depth', format: (value) => `${Math.round(value * 100)}%` },
};

function makeEffect(type: EffectType): EffectState {
  return {
    id: createId(type),
    type,
    enabled: true,
    wet: type === 'compressor' ? 0.72 : 0.36,
    params: defaultParams[type],
  };
}

export function EffectsPanel() {
  const [selectedType, setSelectedType] = useState<EffectType>('delay');
  const effects = useSynthStore((state) => state.effects);
  const addEffect = useSynthStore((state) => state.addEffect);
  const updateEffect = useSynthStore((state) => state.updateEffect);
  const removeEffect = useSynthStore((state) => state.removeEffect);

  return (
    <SectionPanel title="Effects" eyebrow="Master insert chain" accent="red" className="effects-panel">
      <div className="effects-panel-grid">
        <div className="module-block module-block-amber effects-add-block">
          <MiniDisplay eyebrow="FX rack" value={`${effects.length} SLOTS`} detail={effects.length === 0 ? 'Clean bypass' : effects.map((effect) => effect.type).join(' / ')} tone="amber" />
          <label className="compact-control">
            <span className="control-label">Type</span>
            <select className="mini-select panel-select" value={selectedType} onChange={(event) => setSelectedType(event.target.value as EffectType)}>
              {effectTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <button className="soft-button h-9 px-3" onClick={() => addEffect(makeEffect(selectedType))}>
            Add Effect
          </button>
        </div>

        <div className="effects-rack">
          {effects.map((effect) => (
            <div key={effect.id} className="module-block module-block-violet effect-slot">
              <div className="effect-slot-header">
                <MiniDisplay eyebrow="Insert" value={effect.type.toUpperCase()} detail={`${Math.round(effect.wet * 100)}% wet`} tone="mint" />
                <div className="effect-slot-actions">
                  <LedButton active={effect.enabled} onClick={() => updateEffect(effect.id, { enabled: !effect.enabled })}>
                    On
                  </LedButton>
                  <button className="soft-button h-9 px-3" onClick={() => removeEffect(effect.id)}>
                    Del
                  </button>
                </div>
              </div>
              <div className="knob-grid effect-knob-grid">
                <Knob
                  label="Wet"
                  min={0}
                  max={1}
                  step={0.01}
                  value={effect.wet}
                  onChange={(value) => updateEffect(effect.id, { wet: value })}
                  displayValue={`${Math.round(effect.wet * 100)}%`}
                  tone="cyan"
                />
                {Object.entries(effect.params).map(([name, value]) => {
                  const range = paramRanges[name];
                  if (!range) {
                    return null;
                  }
                  return (
                    <Knob
                      key={name}
                      label={range.label}
                      min={range.min}
                      max={range.max}
                      step={range.step}
                      value={value}
                      onChange={(next) => updateEffect(effect.id, { params: { ...effect.params, [name]: next } })}
                      displayValue={range.format ? range.format(value) : String(value)}
                      tone="violet"
                    />
                  );
                })}
              </div>
            </div>
          ))}
          {effects.length === 0 ? <div className="effects-empty">No inserts loaded.</div> : null}
        </div>
      </div>
    </SectionPanel>
  );
}
