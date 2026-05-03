import { EnvelopeModule } from './EnvelopeModule';
import { FilterModule } from './FilterModule';
import { OscillatorModule } from './OscillatorModule';
import { VectorMixer } from './VectorMixer';
import type { NoiseKind, SynthEngineState } from '../types/synth';
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
  private readonly ampEnvelope: EnvelopeModule;
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
    this.ampEnvelope = new EnvelopeModule(context, this.voiceGain.gain);

    this.voiceGain.gain.value = 0.0001;
    this.noiseGain.gain.value = state.noise.enabled ? state.noise.level : 0;

    this.oscA.connect(this.vectorMixer.inputA);
    this.oscB.connect(this.vectorMixer.inputB);
    this.subOsc.connect(this.vectorMixer.inputC);
    this.noiseSource.connect(this.noiseGain);
    this.noiseGain.connect(this.vectorMixer.inputD);
    this.vectorMixer.connect(this.filter.input);
    this.filter.connect(this.voiceGain);
    this.updateState(state);
  }

  connect(destination: AudioNode): void {
    this.voiceGain.connect(destination);
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
    this.oscA.disconnect();
    this.oscB.disconnect();
    this.subOsc.disconnect();
    this.noiseGain.disconnect();
    this.vectorMixer.disconnect();
    this.filter.disconnect();
    this.voiceGain.disconnect();
  }
}
