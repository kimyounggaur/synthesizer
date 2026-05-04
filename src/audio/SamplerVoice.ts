import type { SampleLayerState, SampleZone } from '../types/soundfont';
import { clamp } from '../utils/audioMath';

export interface SamplerVoiceOptions {
  context: AudioContext;
  note: number;
  velocity: number;
  zone: SampleZone;
  buffer: AudioBuffer;
  sampleLayer: SampleLayerState;
  onEnded: (voice: SamplerVoice) => void;
}

export class SamplerVoice {
  readonly note: number;

  private readonly context: AudioContext;
  private readonly sampleLayer: SampleLayerState;
  private readonly onEnded: (voice: SamplerVoice) => void;
  private readonly source: AudioBufferSourceNode;
  private readonly sourceGain: GainNode;
  private readonly filter: BiquadFilterNode | null;
  private readonly ampGain: GainNode;
  private readonly panner: StereoPannerNode;
  private readonly targetGain: number;
  private stopScheduled = false;
  private releaseTimer: number | null = null;
  private ended = false;
  private disposed = false;
  private released = false;
  private started = false;

  constructor(options: SamplerVoiceOptions) {
    this.context = options.context;
    this.note = options.note;
    this.sampleLayer = options.sampleLayer;
    this.onEnded = options.onEnded;

    const velocityGain = Math.max(0.05, Math.min(1, options.velocity));
    this.targetGain = clamp(options.sampleLayer.level, 0, 1.5) * velocityGain * (options.zone.gain ?? 1);

    this.source = options.context.createBufferSource();
    this.sourceGain = options.context.createGain();
    this.filter = options.sampleLayer.filterEnabled ? options.context.createBiquadFilter() : null;
    this.ampGain = options.context.createGain();
    this.panner = options.context.createStereoPanner();

    const semitoneOffset = options.note - options.zone.rootNote;
    this.source.buffer = options.buffer;
    this.source.playbackRate.value = Math.pow(2, semitoneOffset / 12);
    this.source.loop = Boolean(options.zone.loop && !options.sampleLayer.oneShot);
    if (this.source.loop) {
      this.source.loopStart = clamp(options.zone.loopStart ?? 0, 0, options.buffer.duration);
      this.source.loopEnd = clamp(options.zone.loopEnd ?? options.buffer.duration, this.source.loopStart, options.buffer.duration);
    }

    this.source.onended = () => this.finish();
    this.sourceGain.gain.value = 1;
    this.ampGain.gain.value = 0.0001;
    this.panner.pan.value = clamp(options.zone.pan ?? 0, -1, 1);

    if (this.filter) {
      this.filter.type = 'lowpass';
      this.filter.frequency.value = clamp(options.sampleLayer.filterCutoff, 24, 20000);
      this.filter.Q.value = clamp(options.sampleLayer.filterResonance, 0.1, 24);
      this.source.connect(this.sourceGain);
      this.sourceGain.connect(this.filter);
      this.filter.connect(this.ampGain);
    } else {
      this.source.connect(this.sourceGain);
      this.sourceGain.connect(this.ampGain);
    }

    this.ampGain.connect(this.panner);
  }

  connect(destination: AudioNode): void {
    this.panner.connect(destination);
  }

  start(when = this.context.currentTime): void {
    if (this.started || this.ended) {
      return;
    }

    this.started = true;
    const attack = Math.max(0.001, this.sampleLayer.attack);
    const decay = Math.max(0.001, this.sampleLayer.decay);
    const sustain = clamp(this.sampleLayer.sustain, 0, 1);

    this.ampGain.gain.cancelScheduledValues(when);
    this.ampGain.gain.setValueAtTime(0.0001, when);
    this.ampGain.gain.linearRampToValueAtTime(Math.max(0.0001, this.targetGain), when + attack);
    this.ampGain.gain.linearRampToValueAtTime(Math.max(0.0001, this.targetGain * sustain), when + attack + decay);
    this.source.start(when);
  }

  noteOff(when = this.context.currentTime): void {
    if (this.released || this.ended || (this.sampleLayer.oneShot && !this.source.loop)) {
      return;
    }

    this.released = true;
    const release = Math.max(0.001, this.sampleLayer.release);
    this.ampGain.gain.cancelScheduledValues(when);
    this.ampGain.gain.setTargetAtTime(0.0001, when, Math.max(0.01, release / 3));
    this.stopSource(when + release + 0.05);
    this.releaseTimer = window.setTimeout(() => this.finish(), Math.max(30, (release + 0.12) * 1000));
  }

  stopImmediately(): void {
    if (this.ended) {
      return;
    }

    if (this.releaseTimer !== null) {
      window.clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    const now = this.context.currentTime;
    const stopAt = now + 0.03;
    this.ampGain.gain.cancelScheduledValues(now);
    this.ampGain.gain.setTargetAtTime(0.0001, now, 0.01);
    this.stopSource(stopAt);
    this.releaseTimer = window.setTimeout(() => this.finish(), 70);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    if (this.releaseTimer !== null) {
      window.clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    this.source.onended = null;
    this.disconnectNode(this.source);
    this.disconnectNode(this.sourceGain);
    if (this.filter) {
      this.disconnectNode(this.filter);
    }
    this.disconnectNode(this.ampGain);
    this.disconnectNode(this.panner);
  }

  private stopSource(when: number): void {
    if (this.stopScheduled) {
      return;
    }

    this.stopScheduled = true;
    try {
      this.source.stop(when);
    } catch {
      // BufferSource throws if stop was already called or the source never started.
    }
  }

  private finish(): void {
    if (this.ended) {
      return;
    }

    this.ended = true;
    this.dispose();
    this.onEnded(this);
  }

  private disconnectNode(node: AudioNode): void {
    try {
      node.disconnect();
    } catch {
      // Disconnect may throw if the node was already detached.
    }
  }
}
