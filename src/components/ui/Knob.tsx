import { useId, useRef } from 'react';
import type { CSSProperties, PointerEvent } from 'react';

interface KnobProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  displayValue?: string;
  tone?: 'cyan' | 'amber' | 'mint' | 'violet';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function decimals(step: number): number {
  const text = String(step);
  return text.includes('.') ? text.split('.')[1].length : 0;
}

function snap(value: number, step: number): number {
  const precision = decimals(step);
  return Number((Math.round(value / step) * step).toFixed(precision));
}

export function Knob({ label, min, max, step, value, onChange, unit = '', displayValue, tone = 'cyan' }: KnobProps) {
  const id = useId();
  const startRef = useRef({ y: 0, value });
  const normalized = max === min ? 0 : (value - min) / (max - min);
  const angle = -135 + clamp(normalized, 0, 1) * 270;
  const formatted = displayValue ?? `${value >= 100 ? Math.round(value) : value.toFixed(decimals(step))}${unit}`;
  const style = {
    '--knob-angle': `${angle}deg`,
    '--knob-fill': `${clamp(normalized, 0, 1) * 100}%`,
  } as CSSProperties;

  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const delta = startRef.current.y - event.clientY;
    const multiplier = event.shiftKey ? 0.18 : 1;
    const next = snap(startRef.current.value + (delta / 130) * (max - min) * multiplier, step);
    onChange(clamp(next, min, max));
  };

  return (
    <div className={`knob-control knob-${tone}`} style={style}>
      <label className="knob-label" htmlFor={id}>
        {label}
      </label>
      <div
        className="knob-dial"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={(event) => {
          startRef.current = { y: event.clientY, value };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            updateFromPointer(event);
          }
        }}
        onDoubleClick={() => onChange(clamp(snap((min + max) / 2, step), min, max))}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
            event.preventDefault();
            onChange(clamp(snap(value + step, step), min, max));
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
            event.preventDefault();
            onChange(clamp(snap(value - step, step), min, max));
          }
        }}
      >
        <div className="knob-face">
          <span className="knob-indicator" />
        </div>
      </div>
      <input id={id} className="knob-range" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <div className="knob-value">{formatted}</div>
    </div>
  );
}
