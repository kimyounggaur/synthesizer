import type { MeterSnapshot } from '../types/synth';

interface OutputMeterProps {
  meter: MeterSnapshot;
  compact?: boolean;
  onTestTone?: () => void;
}

const ledSteps = [-54, -42, -30, -24, -18, -12, -6, -3, 0, 3];

function toDb(value: number): number {
  if (value <= 0.0001) {
    return -60;
  }
  return Math.max(-60, Math.min(6, 20 * Math.log10(value)));
}

function toMeterWidth(db: number): number {
  return Math.max(0, Math.min(100, ((db + 60) / 66) * 100));
}

function formatDb(db: number): string {
  return db <= -59.5 ? '-inf' : `${db.toFixed(1)} dB`;
}

export function OutputMeter({ meter, compact = false, onTestTone }: OutputMeterProps) {
  const peakDb = toDb(meter.peak);
  const rmsDb = toDb(meter.rms);
  const peakWidth = toMeterWidth(peakDb);
  const rmsWidth = toMeterWidth(rmsDb);
  const signalState = meter.clipping ? 'CLIP' : peakDb > -45 ? 'SIGNAL' : meter.audioState === 'suspended' ? 'SLEEP' : 'IDLE';

  return (
    <section
      className={compact ? 'level-meter is-compact' : 'level-meter'}
      aria-label="Output level meter"
      data-level-meter-status={signalState}
      data-peak-db={peakDb.toFixed(1)}
      data-rms-db={rmsDb.toFixed(1)}
      data-audio-state={meter.audioState}
      data-active-voices={meter.activeVoices}
    >
      <div className="level-meter-header">
        <span>Level Meter</span>
        <div className="level-meter-actions">
          {onTestTone ? (
            <button className="level-meter-test" type="button" onClick={onTestTone}>
              Test
            </button>
          ) : null}
          <span className={meter.clipping ? 'is-clipping' : signalState === 'SIGNAL' ? 'is-signal' : ''}>{signalState}</span>
        </div>
      </div>

      <div className="level-meter-subreadout">
        <span>{meter.audioState}</span>
        <span>{meter.activeVoices} voices</span>
      </div>

      <div className="level-meter-leds" aria-hidden="true">
        {ledSteps.map((step) => (
          <span key={step} className={peakDb >= step ? 'is-on' : ''} />
        ))}
      </div>

      <div className="level-meter-lines">
        <div className="level-meter-line">
          <span>Peak</span>
          <div className="level-meter-track">
            <div className={meter.clipping ? 'level-meter-fill is-hot' : 'level-meter-fill'} style={{ width: `${peakWidth}%` }} />
          </div>
          <span>{formatDb(peakDb)}</span>
        </div>
        <div className="level-meter-line">
          <span>RMS</span>
          <div className="level-meter-track">
            <div className="level-meter-fill is-rms" style={{ width: `${rmsWidth}%` }} />
          </div>
          <span>{formatDb(rmsDb)}</span>
        </div>
      </div>
    </section>
  );
}
