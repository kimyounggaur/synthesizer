import { EnvelopeModule } from './EnvelopeModule';
import { FilterModule } from './FilterModule';
import { OscillatorModule } from './OscillatorModule';
import { VectorMixer } from './VectorMixer';
import type { LfoState, LfoTarget, NoiseKind, SynthEngineState, WaveStep } from '../types/synth';
import { clamp, midiNoteToFrequency, normalizeVelocity } from '../utils/audioMath';

type VoiceEndedCallback = (voice: Voice) => void;

export class Voice {
  readonly note: number;

  private readonly context: AudioContext;
  private readonly velocity: number;
  private readonly onEnded: VoiceEndedCallback;
  private readonly oscA: OscillatorModule;
  private readonly oscB: OscillatorModule;
  private readonly subOsc: OscillatorModule;
  private readonly noiseSource: AudioBufferSourceNode;
  private readonly noiseGain: GainNode;
  private readonly vectorMixer: VectorMixer;
  private readonly filter: FilterModule;
  private readonly voiceGain: GainNode;
  private readonly lfoAmpGain: GainNode;
  private readonly panner: StereoPannerNode;
  private readonly ampEnvelope: EnvelopeModule;
  private lfoTimer: number | null = null;
  private waveSeqTimer: number | null = null;
  private waveSeqIndex = 0;
  private releaseTimer: number | null = null;
  private released = false;
  private state: SynthEngineState;

  constructor(context: AudioContext, note: number, velocity: number, state: SynthEngineState, onEnded: VoiceEndedCallback) {
    this.context = context;
    this.note = note;
    this.velocity = normalizeVelocity(velocity);
    this.state = state;
    this.onEnded = onEnded;

    this.oscA = new OscillatorModule(context, {
      ...state.oscA,
      note,
    });
    this.oscB = new OscillatorModule(context, {
      ...state.oscB,
      note,
    });
    this.subOsc = new OscillatorModule(context, {
      waveform: state.subOsc.waveform,
      octave: state.subOsc.octave,
      semitone: 0,
      fine: 0,
      level: state.subOsc.enabled ? state.subOsc.level : 0,
      note,
    });
    this.noiseGain = context.createGain();
    this.noiseSource = this.createNoiseSource(state.noise.kind);
    this.vectorMixer = new VectorMixer(context);
    this.filter = new FilterModule(context);
    this.voiceGain = context.createGain();
    this.lfoAmpGain = context.createGain();
    this.panner = context.createStereoPanner();
    this.ampEnvelope = new EnvelopeModule(context, this.voiceGain.gain);

    this.voiceGain.gain.value = 0.0001;
    this.lfoAmpGain.gain.value = 1;
    this.panner.pan.value = 0;
    this.noiseGain.gain.value = state.noise.enabled ? state.noise.level : 0;

    this.oscA.connect(this.vectorMixer.inputA);
    this.oscB.connect(this.vectorMixer.inputB);
    this.subOsc.connect(this.vectorMixer.inputC);
    this.noiseSource.connect(this.noiseGain);
    this.noiseGain.connect(this.vectorMixer.inputD);
    this.vectorMixer.connect(this.filter.input);
    this.filter.connect(this.voiceGain);
    this.voiceGain.connect(this.lfoAmpGain);
    this.lfoAmpGain.connect(this.panner);
    this.updateState(state);
  }

  connect(destination: AudioNode): void {
    this.panner.connect(destination);
  }

  start(when = this.context.currentTime): void {
    this.oscA.start(when);
    this.oscB.start(when);
    this.subOsc.start(when);
    this.noiseSource.start(when);
    this.ampEnvelope.triggerAttack(this.state.ampEnv, this.velocity, when);
    this.triggerFilterEnvelope(when);
  }

  noteOff(when = this.context.currentTime): void {
    if (this.released) {
      return;
    }

    this.released = true;
    const endAt = this.ampEnvelope.triggerRelease(this.state.ampEnv, when);
    this.releaseFilterEnvelope(when);
    this.oscA.stop(endAt + 0.05);
    this.oscB.stop(endAt + 0.05);
    this.subOsc.stop(endAt + 0.05);

    try {
      this.noiseSource.stop(endAt + 0.05);
    } catch {
      // BufferSource throws if stop was already scheduled.
    }

    this.releaseTimer = window.setTimeout(() => {
      this.dispose();
      this.onEnded(this);
    }, Math.max(20, (endAt - this.context.currentTime + 0.12) * 1000));
  }

  stopImmediately(): void {
    if (this.releaseTimer !== null) {
      window.clearTimeout(this.releaseTimer);
    }
    this.stopWaveSequencer();
    if (this.lfoTimer !== null) {
      window.clearInterval(this.lfoTimer);
      this.lfoTimer = null;
    }

    const now = this.context.currentTime;
    this.voiceGain.gain.cancelScheduledValues(now);
    this.voiceGain.gain.setTargetAtTime(0.0001, now, 0.01);
    this.oscA.stop(now + 0.03);
    this.oscB.stop(now + 0.03);
    this.subOsc.stop(now + 0.03);

    try {
      this.noiseSource.stop(now + 0.03);
    } catch {
      // No-op if already stopped.
    }

    window.setTimeout(() => {
      this.dispose();
      this.onEnded(this);
    }, 60);
  }

  updateState(state: SynthEngineState): void {
    this.state = state;
    const noteFrequency = midiNoteToFrequency(this.note);
    this.oscA.update({ ...state.oscA, note: this.note });
    this.oscB.update({ ...state.oscB, note: this.note });
    this.subOsc.update({
      waveform: state.subOsc.waveform,
      octave: state.subOsc.octave,
      semitone: 0,
      fine: 0,
      level: state.subOsc.enabled ? state.subOsc.level : 0,
      note: this.note,
    });
    this.noiseGain.gain.setTargetAtTime(state.noise.enabled ? state.noise.level : 0, this.context.currentTime, 0.02);
    this.vectorMixer.setPosition(state.vectorMixer.x, state.vectorMixer.y);
    this.vectorMixer.setLevels({
      a: state.oscA.level,
      b: state.oscB.level,
      c: state.subOsc.enabled ? state.subOsc.level : 0,
      d: state.noise.enabled ? state.noise.level : 0,
    });
    this.filter.setParams(state.filter, noteFrequency);
    this.syncModulators();
  }

  private syncModulators(): void {
    const hasLfo = this.state.lfo1.depth > 0.001 || this.state.lfo2.depth > 0.001;
    if (hasLfo && this.lfoTimer === null) {
      this.lfoTimer = window.setInterval(() => this.applyLfoFrame(), 32);
    }
    if (!hasLfo && this.lfoTimer !== null) {
      window.clearInterval(this.lfoTimer);
      this.lfoTimer = null;
      this.resetLfoModulation();
    }

    if (this.state.waveSequencer.enabled && this.waveSeqTimer === null) {
      this.scheduleWaveStep(0);
    }
    if (!this.state.waveSequencer.enabled && this.waveSeqTimer !== null) {
      this.stopWaveSequencer();
      this.oscA.update({ ...this.state.oscA, note: this.note });
    }
  }

  private resetLfoModulation(): void {
    const now = this.context.currentTime;
    this.oscA.setPitchMod(0);
    this.oscB.setPitchMod(0);
    this.subOsc.setPitchMod(0);
    this.lfoAmpGain.gain.setTargetAtTime(1, now, 0.03);
    this.panner.pan.setTargetAtTime(0, now, 0.03);
    this.vectorMixer.setPosition(this.state.vectorMixer.x, this.state.vectorMixer.y);
  }

  private applyLfoFrame(): void {
    const sums: Record<LfoTarget, number> = {
      pitch: 0,
      filterCutoff: 0,
      ampLevel: 0,
      pan: 0,
      oscMix: 0,
      wavePosition: 0,
    };

    for (const lfo of [this.state.lfo1, this.state.lfo2]) {
      if (lfo.depth <= 0.001) {
        continue;
      }
      sums[lfo.target] += this.lfoValue(lfo) * lfo.depth;
    }

    const now = this.context.currentTime;
    const pitchCents = clamp(sums.pitch, -1, 1) * 1200;
    this.oscA.setPitchMod(pitchCents);
    this.oscB.setPitchMod(pitchCents);
    this.subOsc.setPitchMod(pitchCents);

    if (Math.abs(sums.filterCutoff) > 0.001) {
      const base = this.filter.getBaseCutoff();
      const cutoff = clamp(base * 2 ** (sums.filterCutoff * 2), 24, 18000);
      this.filter.frequency.setTargetAtTime(cutoff, now, 0.035);
    }

    this.lfoAmpGain.gain.setTargetAtTime(clamp(1 + sums.ampLevel * 0.85, 0.05, 1.75), now, 0.035);
    this.panner.pan.setTargetAtTime(clamp(sums.pan, -1, 1), now, 0.035);
    this.vectorMixer.setPosition(clamp(this.state.vectorMixer.x + sums.oscMix * 0.5, 0, 1), clamp(this.state.vectorMixer.y + sums.wavePosition * 0.5, 0, 1));
  }

  private lfoValue(lfo: LfoState): number {
    const phase = (this.context.currentTime * this.lfoRate(lfo)) % 1;
    if (lfo.waveform === 'square') {
      return phase < 0.5 ? 1 : -1;
    }
    if (lfo.waveform === 'pulse') {
      return phase < 0.28 ? 1 : -1;
    }
    if (lfo.waveform === 'sawtooth') {
      return phase * 2 - 1;
    }
    if (lfo.waveform === 'triangle') {
      return 1 - 4 * Math.abs(phase - 0.5);
    }
    if (lfo.waveform === 'wavetable') {
      return Math.sin(phase * Math.PI * 2) * 0.7 + Math.sin(phase * Math.PI * 6) * 0.3;
    }
    return Math.sin(phase * Math.PI * 2);
  }

  private lfoRate(lfo: LfoState): number {
    if (lfo.sync === 'free') {
      return clamp(lfo.rate, 0.01, 30);
    }

    const beats = {
      '1/1': 4,
      '1/2': 2,
      '1/4': 1,
      '1/8': 0.5,
      '1/16': 0.25,
      '1/32': 0.125,
    }[lfo.syncValue];
    return 1 / Math.max(0.03, beats * (60 / this.state.bpm));
  }

  private scheduleWaveStep(delayMs: number): void {
    this.waveSeqTimer = window.setTimeout(() => {
      this.applyWaveStep();
      this.scheduleWaveStep(this.currentWaveStepDuration());
    }, delayMs);
  }

  private applyWaveStep(): void {
    const steps = this.state.waveSequencer.steps;
    if (steps.length === 0 || !this.state.waveSequencer.enabled) {
      return;
    }

    const step = this.nextPlayableStep(steps);
    if (!step) {
      return;
    }

    this.oscA.update({
      ...this.state.oscA,
      waveform: step.reverse ? 'triangle' : step.waveform,
      semitone: this.state.oscA.semitone + step.pitchOffset,
      level: this.state.oscA.level * step.level,
      note: this.note,
    });
  }

  private nextPlayableStep(steps: WaveStep[]): WaveStep | null {
    for (let offset = 0; offset < steps.length; offset += 1) {
      const index = (this.waveSeqIndex + offset) % steps.length;
      const step = steps[index];
      if (!step.skip) {
        this.waveSeqIndex = (index + 1) % steps.length;
        return step;
      }
    }
    return null;
  }

  private currentWaveStepDuration(): number {
    const steps = this.state.waveSequencer.steps;
    const current = steps[(this.waveSeqIndex + steps.length - 1) % steps.length];
    if (!current) {
      return 180;
    }
    if (!this.state.waveSequencer.tempoSync) {
      return clamp(current.duration, 40, 1200);
    }
    return clamp((60 / this.state.bpm) * 1000 * (current.duration / 240), 40, 1200);
  }

  private stopWaveSequencer(): void {
    if (this.waveSeqTimer !== null) {
      window.clearTimeout(this.waveSeqTimer);
      this.waveSeqTimer = null;
    }
    this.waveSeqIndex = 0;
  }

  private triggerFilterEnvelope(when: number): void {
    const amount = this.state.filter.envelopeAmount;
    if (Math.abs(amount) < 0.001) {
      return;
    }

    const base = this.filter.getBaseCutoff();
    const attack = Math.max(0.001, this.state.filterEnv.attack);
    const decay = Math.max(0.001, this.state.filterEnv.decay);
    const peak = clamp(base + amount * 9000, 24, 18000);
    const sustain = clamp(base + amount * 9000 * this.state.filterEnv.sustain, 24, 18000);

    this.filter.frequency.cancelScheduledValues(when);
    this.filter.frequency.setValueAtTime(base, when);
    this.filter.frequency.linearRampToValueAtTime(peak, when + attack);
    this.filter.frequency.exponentialRampToValueAtTime(sustain, when + attack + decay);
  }

  private releaseFilterEnvelope(when: number): void {
    const release = Math.max(0.001, this.state.filterEnv.release);
    const base = clamp(this.filter.getBaseCutoff(), 24, 18000);
    try {
      this.filter.frequency.cancelAndHoldAtTime(when);
    } catch {
      this.filter.frequency.cancelScheduledValues(when);
      this.filter.frequency.setValueAtTime(Math.max(24, this.filter.frequency.value), when);
    }
    this.filter.frequency.exponentialRampToValueAtTime(base, when + release);
  }

  private createNoiseSource(kind: NoiseKind): AudioBufferSourceNode {
    const seconds = 2;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * seconds, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    let pinkB0 = 0;
    let pinkB1 = 0;
    let pinkB2 = 0;

    for (let i = 0; i < channel.length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (kind === 'pink') {
        pinkB0 = 0.99765 * pinkB0 + white * 0.099046;
        pinkB1 = 0.963 * pinkB1 + white * 0.2965164;
        pinkB2 = 0.57 * pinkB2 + white * 1.0526913;
        channel[i] = clamp((pinkB0 + pinkB1 + pinkB2 + white * 0.1848) * 0.16, -1, 1);
      } else {
        channel[i] = white * 0.45;
      }
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  private dispose(): void {
    this.stopWaveSequencer();
    if (this.lfoTimer !== null) {
      window.clearInterval(this.lfoTimer);
      this.lfoTimer = null;
    }
    this.oscA.disconnect();
    this.oscB.disconnect();
    this.subOsc.disconnect();
    this.noiseGain.disconnect();
    this.vectorMixer.disconnect();
    this.filter.disconnect();
    this.voiceGain.disconnect();
    this.lfoAmpGain.disconnect();
    this.panner.disconnect();
  }
}
