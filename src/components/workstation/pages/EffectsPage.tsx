import { useState } from 'react';
import type { EffectState, EffectType } from '../../../types/synth';
import { useSynthStore } from '../../../store/synthStore';
import { createId } from '../../../utils/audioMath';
import { Knob } from '../../ui/Knob';
import { LedButton } from '../../ui/LedButton';
import { MiniDisplay } from '../../ui/MiniDisplay';

const effectTypes: EffectType[] = ['chorus', 'delay', 'reverb', 'distortion', 'flanger', 'phaser', 'compressor', 'eq', 'bitcrusher', 'autoPan'];
const defaultInsertTypes: EffectType[] = ['chorus', 'delay', 'reverb'];

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

function effectLabel(type: EffectType): string {
  return type === 'autoPan' ? 'Auto Pan' : type.charAt(0).toUpperCase() + type.slice(1);
}

export function EffectsPage() {
  const [selectedType, setSelectedType] = useState<EffectType>('chorus');
  const effects = useSynthStore((state) => state.effects);
  const addEffect = useSynthStore((state) => state.addEffect);
  const updateEffect = useSynthStore((state) => state.updateEffect);
  const removeEffect = useSynthStore((state) => state.removeEffect);
  const reorderEffects = useSynthStore((state) => state.reorderEffects);
  const chain = effects.length > 0 ? ['Input', ...effects.map((effect, index) => `IFX${index + 1}`), 'MFX', 'Output'] : ['Input', 'MFX', 'Output'];

  return (
    <div className="workstation-page workstation-lcd-page effects-page">
      <header className="workstation-page-header">
        <MiniDisplay eyebrow="INSERT / MASTER FX" value={`${effects.length} INSERTS`} detail={effects.length ? effects.map((effect) => effectLabel(effect.type)).join(' / ') : 'Dry signal path'} tone="amber" />
        <nav className="workstation-subtabs" aria-label="Effects sections">
          <span className="workstation-subtab is-active">INSERT FX</span>
          <span className="workstation-subtab">MASTER FX</span>
          <span className="workstation-subtab">CHAIN</span>
        </nav>
      </header>

      <div className="effects-page-layout">
        <section className="module-block module-block-amber workstation-card effects-control-card">
          <MiniDisplay eyebrow="INSERT FX" value="IFX RACK" detail="Add, reorder, enable, mix" tone="amber" />
          <div className="effects-add-row">
            <label className="compact-control workstation-select-control">
              <span className="control-label">Type</span>
              <select className="mini-select panel-select" value={selectedType} onChange={(event) => setSelectedType(event.target.value as EffectType)}>
                {effectTypes.map((type) => (
                  <option key={type} value={type}>
                    {effectLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="soft-button effects-add-button" onClick={() => addEffect(makeEffect(selectedType))}>
              Add FX
            </button>
          </div>

          <div className="effects-default-slots" aria-label="Default insert effect slots">
            {defaultInsertTypes.map((type, index) => {
              const loaded = effects[index];
              return (
                <button key={type} type="button" className={loaded ? 'effects-default-slot is-loaded' : 'effects-default-slot'} onClick={() => addEffect(makeEffect(type))}>
                  <span>IFX {index + 1}</span>
                  <strong>{loaded ? effectLabel(loaded.type) : effectLabel(type)}</strong>
                </button>
              );
            })}
          </div>
        </section>

        <section className="module-block module-block-cyan workstation-card effects-chain-card">
          <MiniDisplay eyebrow="CHAIN VIEW" value="SIGNAL FLOW" detail={chain.join(' -> ')} tone="cyan" />
          <div className="effects-chain-view" aria-label="Effects chain view">
            {chain.map((node, index) => (
              <span key={`${node}-${index}`} className={node.startsWith('IFX') || node === 'MFX' ? 'effects-chain-node is-fx' : 'effects-chain-node'}>
                {node}
              </span>
            ))}
          </div>
          <div className="effects-master-grid">
            <div className="effects-master-slot">
              <span>MFX 1</span>
              <strong>Compressor Bus</strong>
            </div>
            <div className="effects-master-slot">
              <span>MFX 2</span>
              <strong>Limiter Output</strong>
            </div>
          </div>
        </section>

        <section className="effects-insert-rack" aria-label="Insert effects rack">
          {effects.map((effect, index) => (
            <div key={effect.id} className="module-block module-block-violet workstation-card effects-workstation-slot">
              <div className="effect-slot-header">
                <MiniDisplay eyebrow={`IFX ${index + 1}`} value={effectLabel(effect.type).toUpperCase()} detail={`${Math.round(effect.wet * 100)}% wet`} tone="mint" />
                <div className="effect-slot-actions">
                  <LedButton active={effect.enabled} onClick={() => updateEffect(effect.id, { enabled: !effect.enabled })}>
                    On
                  </LedButton>
                  <button type="button" className="soft-button effects-order-button" disabled={index === 0} onClick={() => reorderEffects(index, index - 1)}>
                    Up
                  </button>
                  <button type="button" className="soft-button effects-order-button" disabled={index === effects.length - 1} onClick={() => reorderEffects(index, index + 1)}>
                    Down
                  </button>
                  <button type="button" className="soft-button effects-order-button" onClick={() => removeEffect(effect.id)}>
                    Del
                  </button>
                </div>
              </div>

              <div className="workstation-knob-grid effects-workstation-knobs">
                <Knob label="Wet/Dry" min={0} max={1} step={0.01} value={effect.wet} onChange={(value) => updateEffect(effect.id, { wet: value })} displayValue={`${Math.round(effect.wet * 100)}%`} tone="cyan" />
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
          {effects.length === 0 ? <div className="effects-empty workstation-effects-empty">No insert effects loaded.</div> : null}
        </section>
      </div>
    </div>
  );
}
