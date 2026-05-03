import { Voice } from './Voice';
import type { MeterSnapshot, SynthEngineState } from '../types/synth';
import { clamp } from '../utils/audioMath';
import { EffectsChain } from './EffectsChain';

type WindowWithWebkitAudio = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export class AudioEngine {
  private readonly context: AudioContext;
  private readonly masterGain: GainNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly analyser: AnalyserNode;
  private readonly voices = new Map<number, Voice>();
  private state: SynthEngineState;
  private maxPolyphony: number;
  private analyserBuffer: Float32Array<ArrayBuffer>;
  private effectsChain: EffectsChain | null = null;

  constructor(initialState: SynthEngineState) {
    const AudioContextCtor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error('Web Audio API is not supported in this browser.');
    }

    this.context = new AudioContextCtor();
    this.masterGain = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.analyser = this.context.createAnalyser();
    this.state = initialState;
    this.maxPolyphony = initialState.polyphony;
    this.analyserBuffer = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>;

    this.masterGain.gain.value = initialState.masterVolume;
    this.compressor.threshold.value = -10;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.72;
    this.effectsChain = new EffectsChain(this.context, initialState.effects);
    this.masterGain.connect(this.effectsChain.input);
    this.effectsChain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }

  async resume(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  setState(state: SynthEngineState): void {
    this.state = state;
    this.maxPolyphony = state.polyphony;
    this.setMasterVolume(state.masterVolume);
    this.effectsChain?.update(state.effects);
    this.voices.forEach((voice) => voice.updateState(state));
  }

  async noteOn(note: number, velocity = 1): Promise<void> {
    await this.resume();

    const existing = this.voices.get(note);
    if (existing) {
      existing.stopImmediately();
      this.voices.delete(note);
    }

    this.trimPolyphony();

    const voice = new Voice(this.context, note, velocity, this.state, (endedVoice) => {
      if (this.voices.get(endedVoice.note) === endedVoice) {
        this.voices.delete(endedVoice.note);
      }
    });

    this.voices.set(note, voice);
    voice.connect(this.masterGain);
    voice.start();
  }

  noteOff(note: number): void {
    const voice = this.voices.get(note);
    if (!voice) {
      return;
    }
    voice.noteOff();
  }

  setMasterVolume(value: number): void {
    this.masterGain.gain.setTargetAtTime(clamp(value, 0, 1), this.context.currentTime, 0.02);
  }

  panic(): void {
    this.voices.forEach((voice) => voice.stopImmediately());
    this.voices.clear();
  }

  connectEffectsChain(chain: EffectsChain | null): void {
    this.effectsChain?.disconnect();
    this.effectsChain = chain;
    this.masterGain.disconnect();

    if (chain) {
      this.masterGain.connect(chain.input);
      chain.connect(this.compressor);
    } else {
      this.masterGain.connect(this.compressor);
    }
  }

  getAnalyserData(): MeterSnapshot {
    this.analyser.getFloatTimeDomainData(this.analyserBuffer);

    let sum = 0;
    let peak = 0;
    for (const sample of this.analyserBuffer) {
      const abs = Math.abs(sample);
      peak = Math.max(peak, abs);
      sum += sample * sample;
    }

    return {
      peak: clamp(peak, 0, 1.5),
      rms: clamp(Math.sqrt(sum / this.analyserBuffer.length), 0, 1),
      clipping: peak >= 0.98,
    };
  }

  close(): void {
    this.panic();
    void this.context.close();
  }

  private trimPolyphony(): void {
    while (this.voices.size >= this.maxPolyphony) {
      const oldest = this.voices.keys().next().value as number | undefined;
      if (oldest === undefined) {
        return;
      }
      const voice = this.voices.get(oldest);
      voice?.stopImmediately();
      this.voices.delete(oldest);
    }
  }
}
