import { EnvelopeModule } from './EnvelopeModule';
import type { SampleLayerState, SamplePresetDefinition, SampleZone } from '../types/soundfont';
import type { SynthEngineState } from '../types/synth';
import { clamp, normalizeVelocity, semitoneRatio } from '../utils/audioMath';

type SamplerVoiceEndedCallback = (voice: SamplerVoice) => void;

interface SamplerVoiceOptions {
  buffer: AudioBuffer;
  preset: SamplePresetDefinition;
  zone: SampleZone;
}

export class SamplerVoice {
  readonly note: number;

  private readonly context: AudioContext;
  private readonly velocity: number;
  private readonly onEnded: SamplerVoiceEndedCallback;
  private readonly source: AudioBufferSourceNode;
  private readonly zoneGain: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly voiceGain: GainNode;
  private readonly panner: StereoPannerNode;
  private readonly ampEnvelope: EnvelopeModule;
  private readonly zone: SampleZone;
  private releaseTimer: number | null = null;
  private state: SynthEngineState;
  private ended = false;
  private released = false;

  constructor(context: AudioContext, note: number, velocity: number, state: SynthEngineState, options: SamplerVoiceOptions, onEnded: SamplerVoiceEndedCallback) {
    this.context = context;
    this.note = note;
    this.velocity = normalizeVelocity(velocity);
    this.state = state;
    this.zone = options.zone;
    this.onEnded = onEnded;

    this.source = context.createBufferSource();
    this.zoneGain = context.createGain();
    this.filter = context.createBiquadFilter();
    this.voiceGain = context.createGain();
    this.panner = context.createStereoPanner();
    this.ampEnvelope = new EnvelopeModule(context, this.voiceGain.gain);

    this.source.buffer = options.buffer;
    this.source.playbackRate.value = semitoneRatio(note - options.zone.rootNote);
    this.source.loop = Boolean(options.zone.loop && !state.sampleLayer.oneShot);
    if (this.source.loop && options.zone.loopStart !== undefined) {
      this.source.loopStart = clamp(options.zone.loopStart, 0, options.buffer.duration);
    }
    if (this.source.loop && options.zone.loopEnd !== undefined) {
      this.source.loopEnd = clamp(options.zone.loopEnd, this.source.loopStart, options.buffer.duration);
    }

    this.source.onended = () => this.finish();
    this.zoneGain.gain.value = options.zone.gain ?? 1;
    this.filter.type = 'lowpass';
    this.voiceGain.gain.value = 0.0001;
    this.panner.pan.value = clamp(options.zone.pan ?? 0, -1, 1);

    this.source.connect(this.zoneGain);
    this.zoneGain.connect(this.filter);
    this.filter.connect(this.voiceGain);
    this.voiceGain.connect(this.panner);
    this.updateState(state);
  }

  connect(destination: AudioNode): void {
    this.panner.connect(destination);
  }

  start(when = this.context.currentTime): void {
    const layer = this.state.sampleLayer;
    this.source.start(when);
    this.ampEnvelope.triggerAttack(this.toEnvelope(layer), this.velocity * clamp(layer.level, 0, 1.5), when);
  }

  noteOff(when = this.context.currentTime): void {
    if (this.released || (this.state.sampleLayer.oneShot && !this.source.loop)) {
      return;
    }

    this.released = true;
    const endAt = this.ampEnvelope.triggerRelease(this.toEnvelope(this.state.sampleLayer), when);
    try {
      this.source.stop(endAt + 0.05);
    } catch {
      // BufferSource throws if stop was already scheduled.
    }

    this.releaseTimer = window.setTimeout(() => this.finish(), Math.max(20, (endAt - this.context.currentTime + 0.12) * 1000));
  }

  stopImmediately(): void {
    if (this.releaseTimer !== null) {
      window.clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    const now = this.context.currentTime;
    this.voiceGain.gain.cancelScheduledValues(now);
    this.voiceGain.gain.setTargetAtTime(0.0001, now, 0.01);
    try {
      this.source.stop(now + 0.03);
    } catch {
      // No-op if already stopped.
    }

    this.releaseTimer = window.setTimeout(() => this.finish(), 70);
  }

  updateState(state: SynthEngineState): void {
    this.state = state;
    const layer = state.sampleLayer;
    const now = this.context.currentTime;
    this.filter.frequency.setTargetAtTime(layer.filterEnabled ? clamp(layer.filterCutoff, 24, 20000) : 20000, now, 0.02);
    this.filter.Q.setTargetAtTime(layer.filterEnabled ? clamp(layer.filterResonance, 0.1, 24) : 0.1, now, 0.02);
    this.panner.pan.setTargetAtTime(clamp(this.zone.pan ?? 0, -1, 1), now, 0.02);
  }

  private toEnvelope(layer: SampleLayerState) {
    return {
      attack: layer.attack,
      decay: layer.decay,
      sustain: layer.sustain,
      release: layer.release,
    };
  }

  private finish(): void {
    if (this.ended) {
      return;
    }

    this.ended = true;
    if (this.releaseTimer !== null) {
      window.clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
    this.dispose();
    this.onEnded(this);
  }

  private dispose(): void {
    this.source.disconnect();
    this.zoneGain.disconnect();
    this.filter.disconnect();
    this.voiceGain.disconnect();
    this.panner.disconnect();
  }
}
