import { VectorMixer } from '../audio/VectorMixer';
import { useSynthStore } from '../store/synthStore';
import { Knob } from './ui/Knob';
import { MiniDisplay } from './ui/MiniDisplay';
import { SectionPanel } from './ui/SectionPanel';

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function VectorMixerPanel() {
  const vectorMixer = useSynthStore((state) => state.vectorMixer);
  const updateVectorPosition = useSynthStore((state) => state.updateVectorPosition);
  const weights = VectorMixer.calculateWeights(vectorMixer.x, vectorMixer.y);

  return (
    <SectionPanel title="Vector" eyebrow="Four-source mixer" accent="mint" className="vector-panel">
      <div className="vector-panel-grid">
        <div className="module-block module-block-mint">
          <MiniDisplay eyebrow="Vector position" value={`X ${formatPercent(vectorMixer.x)}`} detail={`Y ${formatPercent(vectorMixer.y)}`} tone="mint" />
          <div className="vector-pad" aria-label="Vector mixer pad">
            <span className="vector-axis vector-axis-x" />
            <span className="vector-axis vector-axis-y" />
            <span className="vector-corner vector-corner-a">A</span>
            <span className="vector-corner vector-corner-b">B</span>
            <span className="vector-corner vector-corner-c">SUB</span>
            <span className="vector-corner vector-corner-d">NOISE</span>
            <span className="vector-cursor" style={{ left: `${vectorMixer.x * 100}%`, top: `${(1 - vectorMixer.y) * 100}%` }} />
          </div>
        </div>

        <div className="module-block module-block-cyan">
          <div className="knob-grid knob-grid-four">
            <Knob label="X Mix" min={0} max={1} step={0.01} value={vectorMixer.x} onChange={(value) => updateVectorPosition({ x: value })} displayValue={formatPercent(vectorMixer.x)} tone="mint" />
            <Knob label="Y Mix" min={0} max={1} step={0.01} value={vectorMixer.y} onChange={(value) => updateVectorPosition({ y: value })} displayValue={formatPercent(vectorMixer.y)} tone="mint" />
          </div>
          <div className="vector-weight-grid">
            <span>A {formatPercent(weights.a)}</span>
            <span>B {formatPercent(weights.b)}</span>
            <span>SUB {formatPercent(weights.c)}</span>
            <span>NOISE {formatPercent(weights.d)}</span>
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}
