import type { SynthEngineState, SynthPreset } from '../types/synth';

type ArtworkSize = 'hero' | 'thumb';
type ArtworkCategory = SynthPreset['category'];

interface PresetArtworkProps {
  preset?: { id: string; category: ArtworkCategory };
  engine: SynthEngineState;
  size?: ArtworkSize;
}

const palettes: Record<ArtworkCategory, { base: string; deep: string; accent: string; secondary: string; glow: string }> = {
  Bass: { base: '#120b1b', deep: '#050309', accent: '#ff6a2a', secondary: '#ffcf5f', glow: '#ff6a2a' },
  Lead: { base: '#07142a', deep: '#020712', accent: '#67f3ff', secondary: '#ff74cf', glow: '#67f3ff' },
  Pad: { base: '#1b1231', deep: '#080411', accent: '#c69cff', secondary: '#65f0dc', glow: '#c69cff' },
  Pluck: { base: '#1b1009', deep: '#060302', accent: '#ffd071', secondary: '#ff8a4d', glow: '#ffd071' },
  Bell: { base: '#071a22', deep: '#02080d', accent: '#d9fbff', secondary: '#69e8ff', glow: '#d9fbff' },
  Sequence: { base: '#0a1022', deep: '#030610', accent: '#7dff86', secondary: '#61d7ff', glow: '#7dff86' },
  Ambient: { base: '#17162d', deep: '#05050f', accent: '#ffb9e8', secondary: '#8eeaff', glow: '#ffb9e8' },
  FX: { base: '#1c0d13', deep: '#060205', accent: '#ff4f65', secondary: '#ffe36f', glow: '#ff4f65' },
  Experimental: { base: '#101014', deep: '#030306', accent: '#f4ff6f', secondary: '#a178ff', glow: '#f4ff6f' },
  Keys: { base: '#101725', deep: '#03070e', accent: '#f8f6ff', secondary: '#78e4ff', glow: '#78e4ff' },
  Piano: { base: '#111722', deep: '#03060b', accent: '#ffffff', secondary: '#8bd7ff', glow: '#8bd7ff' },
  'E-Piano': { base: '#17121f', deep: '#05030a', accent: '#9ff5ff', secondary: '#ffca7a', glow: '#9ff5ff' },
  Organ: { base: '#101c15', deep: '#030704', accent: '#7dffb6', secondary: '#f2d16b', glow: '#7dffb6' },
  Strings: { base: '#1d1320', deep: '#060308', accent: '#ffd1e7', secondary: '#b88cff', glow: '#ffd1e7' },
  Choir: { base: '#17182a', deep: '#04050d', accent: '#d8e3ff', secondary: '#ffb7e6', glow: '#d8e3ff' },
  Brass: { base: '#1f1508', deep: '#060301', accent: '#ffd36d', secondary: '#ff7e45', glow: '#ffd36d' },
  Woodwind: { base: '#111b17', deep: '#030705', accent: '#b8ffd5', secondary: '#8ec8ff', glow: '#b8ffd5' },
  Guitar: { base: '#1b120c', deep: '#060302', accent: '#ffc07a', secondary: '#80f0cf', glow: '#ffc07a' },
  Mallet: { base: '#121821', deep: '#03060a', accent: '#e2f5ff', secondary: '#ffbf69', glow: '#e2f5ff' },
  Drum: { base: '#1c1010', deep: '#060202', accent: '#ff7a5d', secondary: '#fff06b', glow: '#ff7a5d' },
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function inferCategory(engine: SynthEngineState): ArtworkCategory {
  if (engine.engineMode === 'sample') {
    return 'Piano';
  }
  if (engine.engineMode === 'hybrid' && engine.sampleLayer.enabled) {
    return 'Keys';
  }
  if (engine.waveSequencer.enabled) {
    return 'Sequence';
  }
  if (engine.effects.some((effect) => ['bitcrusher', 'distortion', 'flanger'].includes(effect.type)) || engine.noise.level > 0.35) {
    return 'FX';
  }
  if (engine.ampEnv.attack > 0.6 || engine.ampEnv.release > 1.2) {
    return engine.noise.enabled ? 'Ambient' : 'Pad';
  }
  if (engine.subOsc.enabled && engine.oscA.octave < 0) {
    return 'Bass';
  }
  if (engine.ampEnv.decay < 0.16 && engine.ampEnv.sustain < 0.5) {
    return 'Pluck';
  }
  if (engine.oscA.waveform === 'sine' && engine.oscB.octave > 0) {
    return 'Bell';
  }
  return 'Lead';
}

function waveformValue(waveform: string, phase: number): number {
  const x = ((phase % 1) + 1) % 1;
  if (waveform === 'square') {
    return x < 0.5 ? 1 : -1;
  }
  if (waveform === 'sawtooth') {
    return x * 2 - 1;
  }
  if (waveform === 'triangle') {
    return 1 - Math.abs(x * 4 - 2);
  }
  if (waveform === 'pulse') {
    return x < 0.28 ? 1 : -0.72;
  }
  if (waveform === 'wavetable') {
    return Math.sin(x * Math.PI * 2) * 0.58 + Math.sin(x * Math.PI * 6 + 0.8) * 0.28 + Math.sin(x * Math.PI * 10) * 0.14;
  }
  return Math.sin(x * Math.PI * 2);
}

function waveformPoints(waveform: string, width: number, centerY: number, amplitude: number, phaseOffset: number): string {
  return Array.from({ length: 48 }, (_, index) => {
    const ratio = index / 47;
    const x = ratio * width;
    const y = centerY - waveformValue(waveform, ratio * 3 + phaseOffset) * amplitude;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export function PresetArtwork({ preset, engine, size = 'hero' }: PresetArtworkProps) {
  const category = preset?.category ?? inferCategory(engine);
  const palette = palettes[category];
  const seed = hashString(`${preset?.id ?? 'manual'}-${engine.oscA.waveform}-${engine.oscB.waveform}-${category}`);
  const width = size === 'hero' ? 220 : 72;
  const height = size === 'hero' ? 96 : 44;
  const idBase = `art-${size}-${seed}`;
  const cutoff = clamp(engine.filter.cutoff / 18000);
  const resonance = clamp(engine.filter.resonance / 18);
  const drive = clamp(engine.filter.drive);
  const vectorX = clamp(engine.vectorMixer.x);
  const vectorY = clamp(engine.vectorMixer.y);
  const effectEnergy = clamp(engine.effects.filter((effect) => effect.enabled).length / 5);
  const release = clamp(engine.ampEnv.release / 1.8);
  const phase = (seed % 97) / 97;
  const primaryWave = waveformPoints(engine.oscA.waveform, width, height * 0.52, height * (0.12 + engine.oscA.level * 0.1), phase);
  const secondaryWave = waveformPoints(engine.oscB.waveform, width, height * 0.62, height * (0.08 + engine.oscB.level * 0.07), phase + 0.21);
  const steps = Array.from({ length: 12 }, (_, index) => ({ index, on: ((seed >> (index % 8)) + index) % 3 !== 0 }));
  const shards = Array.from({ length: 8 }, (_, index) => {
    const x = ((seed % (31 + index * 7)) / (31 + index * 7)) * width;
    const y = height * (0.18 + ((index * 19 + seed) % 54) / 100);
    return `${x.toFixed(1)},${y.toFixed(1)} ${(x + 10 + index).toFixed(1)},${(y + 4).toFixed(1)} ${(x + 4).toFixed(1)},${(y + 18).toFixed(1)}`;
  });

  return (
    <div className={`preset-artwork preset-artwork-${size}`} aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" focusable="false">
        <defs>
          <linearGradient id={`${idBase}-bg`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={palette.base} />
            <stop offset="100%" stopColor={palette.deep} />
          </linearGradient>
          <linearGradient id={`${idBase}-signal`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={palette.secondary} stopOpacity="0.1" />
            <stop offset={`${Math.round(cutoff * 100)}%`} stopColor={palette.accent} />
            <stop offset="100%" stopColor={palette.secondary} stopOpacity="0.72" />
          </linearGradient>
          <filter id={`${idBase}-glow`} x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation={size === 'hero' ? 3.4 : 1.8} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width={width} height={height} rx={size === 'hero' ? 12 : 6} fill={`url(#${idBase}-bg)`} />
        <rect x="0" y="0" width={width} height={height} rx={size === 'hero' ? 12 : 6} fill={palette.glow} opacity={0.05 + release * 0.12} />
        {category === 'Sequence' ? (
          <g opacity="0.8">
            {steps.map(({ index, on }) => (
              <rect
                key={index}
                x={8 + index * ((width - 18) / 12)}
                y={height - 18 - (on ? ((index % 5) + 1) * 3 : 0)}
                width={(width - 42) / 12}
                height={on ? 10 + (index % 5) * 3 : 4}
                rx="2"
                fill={on ? palette.accent : palette.secondary}
                opacity={on ? 0.82 : 0.24}
              />
            ))}
          </g>
        ) : null}
        {category === 'Bell' || category === 'Experimental' || category === 'FX' ? (
          <g opacity={category === 'Experimental' ? 0.62 : 0.46}>
            {shards.map((points, index) => (
              <polygon key={index} points={points} fill={index % 2 ? palette.secondary : palette.accent} opacity={0.22 + (index % 3) * 0.1} />
            ))}
          </g>
        ) : null}
        {category === 'Pad' || category === 'Ambient' ? (
          <g fill="none" opacity="0.42">
            <path d={`M 0 ${height * 0.72} C ${width * 0.26} ${height * (0.44 - release * 0.12)}, ${width * 0.58} ${height * 0.9}, ${width} ${height * (0.48 + vectorY * 0.18)}`} stroke={palette.secondary} strokeWidth={size === 'hero' ? 11 : 5} />
            <path d={`M 0 ${height * 0.4} C ${width * 0.24} ${height * 0.14}, ${width * 0.64} ${height * 0.22}, ${width} ${height * (0.18 + release * 0.36)}`} stroke={palette.accent} strokeWidth={size === 'hero' ? 5 : 2.4} />
          </g>
        ) : null}
        {category === 'Bass' ? (
          <g opacity="0.56">
            <rect x={width * 0.06} y={height * 0.72} width={width * (0.34 + drive * 0.24)} height={height * 0.08} rx="4" fill={palette.accent} />
            <rect x={width * 0.18} y={height * 0.84} width={width * (0.42 + resonance * 0.22)} height={height * 0.07} rx="4" fill={palette.secondary} opacity="0.72" />
          </g>
        ) : null}
        <line x1="0" x2={width} y1={height * (0.82 - cutoff * 0.46)} y2={height * (0.82 - cutoff * 0.46)} stroke={palette.secondary} strokeWidth={size === 'hero' ? 1.5 : 1} opacity="0.34" />
        <polyline points={secondaryWave} fill="none" stroke={palette.secondary} strokeWidth={size === 'hero' ? 2.2 : 1.25} opacity="0.62" />
        <polyline points={primaryWave} fill="none" stroke={`url(#${idBase}-signal)`} strokeWidth={size === 'hero' ? 3.2 : 1.7} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${idBase}-glow)`} />
        <circle cx={width * (0.12 + vectorX * 0.76)} cy={height * (0.16 + vectorY * 0.68)} r={size === 'hero' ? 4.5 + effectEnergy * 3 : 2.4 + effectEnergy * 1.6} fill={palette.accent} opacity="0.92" filter={`url(#${idBase}-glow)`} />
      </svg>
    </div>
  );
}
