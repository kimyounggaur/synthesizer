import { Voice } from './Voice';
import type { MeterSnapshot, SynthEngineState } from '../types/synth';
import { clamp } from '../utils/audioMath';
import { EffectsChain } from './EffectsChain';
import { SamplerVoice } from './SamplerVoice';
import { SampleBankManager } from './SampleBankManager';
import type { DrumSoundId } from './drumKit';

type WindowWithWebkitAudio = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

type ActiveVoice = Voice | SamplerVoice;

function isSynthVoice(voice: ActiveVoice): voice is Voice {
  return voice instanceof Voice;
}

export class AudioEngine {
  private readonly context: AudioContext;
  private readonly masterGain: GainNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly analyser: AnalyserNode;
  private readonly voices = new Map<number, ActiveVoice>();
  private readonly drumSources = new Set<AudioScheduledSourceNode>();
  private state: SynthEngineState;
  private maxPolyphony: number;
  private analyserBuffer: Float32Array<ArrayBuffer>;
  private effectsChain: EffectsChain | null = null;
  private readonly sampleBankManager: SampleBankManager;
  private preloadedSampleKey: string | null = null;

  constructor(initialState: SynthEngineState) {
    const AudioContextCtor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error('Web Audio API is not supported in this browser.');
    }

    this.context = new AudioContextCtor();
    this.masterGain = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.analyser = this.context.createAnalyser();
    this.sampleBankManager = new SampleBankManager(this.context);
    this.state = initialState;
    this.maxPolyphony = initialState.polyphony;

    this.masterGain.gain.value = initialState.masterVolume;
    this.compressor.threshold.value = -10;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.72;
    this.analyserBuffer = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>;
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
    this.voices.forEach((voice) => {
      if (isSynthVoice(voice)) {
        voice.updateState(state);
      }
    });
    const sampleKey = `${state.sampleLayer.bankId ?? ''}:${state.sampleLayer.presetId ?? ''}`;
    if (state.sampleLayer.enabled && state.sampleLayer.preload && state.sampleLayer.bankId && state.sampleLayer.presetId && sampleKey !== this.preloadedSampleKey) {
      this.preloadedSampleKey = sampleKey;
      void this.sampleBankManager.preloadPreset(state.sampleLayer.bankId, state.sampleLayer.presetId).catch((error) => {
        console.warn(error);
      });
    }
  }

  async noteOn(note: number, velocity = 1): Promise<void> {
    await this.resume();

    const existing = this.voices.get(note);
    if (existing) {
      existing.stopImmediately();
      this.voices.delete(note);
    }

    this.trimPolyphony();

    if (this.state.engineMode === 'sample') {
      await this.noteOnSample(note, velocity);
      return;
    }

    if (this.state.engineMode === 'hybrid') {
      await this.noteOnHybrid(note, velocity);
      return;
    }

    this.noteOnSynth(note, velocity);
  }

  noteOff(note: number): void {
    const voice = this.voices.get(note);
    if (!voice) {
      return;
    }
    voice.noteOff();
  }

  async playDrum(sound: DrumSoundId, velocity = 1): Promise<void> {
    await this.resume();
    const level = clamp(velocity, 0.05, 1);

    if (sound === 'kick') {
      this.playTone({ type: 'sine', startFreq: 136, endFreq: 42, duration: 0.52, gain: 1.22, velocity: level });
      this.playNoise({ duration: 0.035, gain: 0.22, velocity: level, filterType: 'highpass', frequency: 4200, q: 0.7 });
      return;
    }

    if (sound === 'snare') {
      this.playTone({ type: 'triangle', startFreq: 205, endFreq: 145, duration: 0.22, gain: 0.34, velocity: level });
      this.playNoise({ duration: 0.32, gain: 0.88, velocity: level, filterType: 'bandpass', frequency: 1900, q: 1.1 });
      return;
    }

    if (sound === 'closedHat') {
      this.playNoise({ duration: 0.085, gain: 0.48, velocity: level, filterType: 'highpass', frequency: 7600, q: 0.92 });
      return;
    }

    if (sound === 'openHat') {
      this.playNoise({ duration: 0.58, gain: 0.42, velocity: level, filterType: 'highpass', frequency: 6700, q: 0.84, attack: 0.002 });
      return;
    }

    if (sound === 'clap') {
      [0, 0.018, 0.038].forEach((delay) => {
        this.playNoise({ duration: 0.16, gain: 0.36, velocity: level, filterType: 'bandpass', frequency: 1500, q: 0.8, delay });
      });
      return;
    }

    if (sound === 'lowTom') {
      this.playTone({ type: 'sine', startFreq: 132, endFreq: 78, duration: 0.44, gain: 0.82, velocity: level });
      return;
    }

    if (sound === 'midTom') {
      this.playTone({ type: 'sine', startFreq: 192, endFreq: 112, duration: 0.36, gain: 0.72, velocity: level });
      return;
    }

    if (sound === 'highTom') {
      this.playTone({ type: 'sine', startFreq: 286, endFreq: 172, duration: 0.3, gain: 0.62, velocity: level });
      return;
    }

    if (sound === 'rim') {
      this.playTone({ type: 'square', startFreq: 820, endFreq: 780, duration: 0.08, gain: 0.36, velocity: level });
      this.playNoise({ duration: 0.05, gain: 0.18, velocity: level, filterType: 'highpass', frequency: 5200, q: 1.4 });
      return;
    }

    if (sound === 'cowbell') {
      this.playTone({ type: 'square', startFreq: 560, endFreq: 560, duration: 0.19, gain: 0.24, velocity: level });
      this.playTone({ type: 'square', startFreq: 835, endFreq: 835, duration: 0.19, gain: 0.18, velocity: level });
      return;
    }

    if (sound === 'crash') {
      this.playNoise({ duration: 1.35, gain: 0.52, velocity: level, filterType: 'highpass', frequency: 4800, q: 0.42, attack: 0.003 });
      return;
    }

    if (sound === 'ride') {
      this.playNoise({ duration: 0.82, gain: 0.34, velocity: level, filterType: 'bandpass', frequency: 6200, q: 1.8, attack: 0.002 });
      this.playTone({ type: 'triangle', startFreq: 1180, endFreq: 1160, duration: 0.28, gain: 0.11, velocity: level });
      return;
    }

    if (sound === 'shaker') {
      this.playNoise({ duration: 0.13, gain: 0.32, velocity: level, filterType: 'highpass', frequency: 9200, q: 1.1 });
      return;
    }

    if (sound === 'tambourine') {
      [0, 0.026].forEach((delay) => {
        this.playNoise({ duration: 0.18, gain: 0.28, velocity: level, filterType: 'highpass', frequency: 7800, q: 0.8, delay });
      });
      return;
    }

    if (sound === 'click') {
      this.playTone({ type: 'square', startFreq: 2600, endFreq: 2300, duration: 0.045, gain: 0.26, velocity: level });
      return;
    }

    this.playTone({ type: 'sine', startFreq: 92, endFreq: 28, duration: 0.85, gain: 0.86, velocity: level });
  }

  setMasterVolume(value: number): void {
    this.masterGain.gain.setTargetAtTime(clamp(value, 0, 1), this.context.currentTime, 0.02);
  }

  panic(): void {
    this.voices.forEach((voice) => voice.stopImmediately());
    this.voices.clear();
    this.drumSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Source may already be stopping; the onended cleanup will finish it.
      }
    });
    this.drumSources.clear();
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
      audioState: this.context.state,
      activeVoices: this.voiceCount(),
    };
  }

  close(): void {
    this.panic();
    this.sampleBankManager.clearCache();
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

  private noteOnSynth(note: number, velocity: number): void {
    const voice = new Voice(this.context, note, velocity, this.state, (endedVoice) => this.removeVoice(endedVoice));
    this.voices.set(note, voice);
    voice.connect(this.masterGain);
    voice.start();
  }

  private async noteOnSample(note: number, velocity: number): Promise<void> {
    const layer = this.state.sampleLayer;

    if (!layer.enabled || !layer.bankId || !layer.presetId) {
      this.noteOnSynth(note, velocity);
      return;
    }

    try {
      await this.sampleBankManager.loadBank(layer.bankId);
      const preset = this.sampleBankManager.getPreset(layer.bankId, layer.presetId);

      if (!preset) {
        console.warn('[AudioEngine] Sample preset not found. Falling back to synth voice.');
        this.noteOnSynth(note, velocity);
        return;
      }

      const zone = this.sampleBankManager.findZone(preset, note, velocity);

      if (!zone) {
        console.warn('[AudioEngine] No sample zone matched. Falling back to synth voice.');
        this.noteOnSynth(note, velocity);
        return;
      }

      const buffer = await this.sampleBankManager.getBufferForZone(layer.bankId, zone);

      const voice = new SamplerVoice({
        context: this.context,
        note,
        velocity,
        zone,
        buffer,
        sampleLayer: layer,
        onEnded: (endedVoice) => this.removeVoice(endedVoice),
      });

      this.voices.set(note, voice);
      voice.connect(this.masterGain);
      voice.start();
    } catch (error) {
      console.warn('[AudioEngine] Sample voice failed. Falling back to synth voice.', error);
      this.noteOnSynth(note, velocity);
    }
  }

  private async noteOnHybrid(note: number, velocity: number): Promise<void> {
    // MVP: hybrid mode currently uses sample layer when available.
    // Future: create HybridVoice that contains both Voice and SamplerVoice.
    await this.noteOnSample(note, velocity);
  }

  private removeVoice(voice: ActiveVoice): void {
    if (this.voices.get(voice.note) === voice) {
      this.voices.delete(voice.note);
    }
  }

  private voiceCount(): number {
    return this.voices.size;
  }

  private playTone(options: {
    type: OscillatorType;
    startFreq: number;
    endFreq: number;
    duration: number;
    gain: number;
    velocity: number;
    delay?: number;
  }): void {
    const now = this.context.currentTime + (options.delay ?? 0);
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const stopAt = now + options.duration + 0.05;

    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(Math.max(1, options.startFreq), now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFreq), now + options.duration);

    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.linearRampToValueAtTime(options.gain * options.velocity, now + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

    oscillator.connect(envelope);
    envelope.connect(this.masterGain);
    oscillator.start(now);
    oscillator.stop(stopAt);
    this.drumSources.add(oscillator);
    oscillator.onended = () => {
      this.drumSources.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
  }

  private playNoise(options: {
    duration: number;
    gain: number;
    velocity: number;
    filterType: BiquadFilterType;
    frequency: number;
    q: number;
    attack?: number;
    delay?: number;
  }): void {
    const now = this.context.currentTime + (options.delay ?? 0);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const attack = options.attack ?? 0.001;
    const stopAt = now + options.duration + 0.04;

    source.buffer = this.createNoiseBuffer(options.duration + 0.04);
    filter.type = options.filterType;
    filter.frequency.setValueAtTime(options.frequency, now);
    filter.Q.setValueAtTime(options.q, now);

    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.linearRampToValueAtTime(options.gain * options.velocity, now + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.masterGain);
    source.start(now);
    source.stop(stopAt);
    this.drumSources.add(source);
    source.onended = () => {
      this.drumSources.delete(source);
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
  }

  private createNoiseBuffer(seconds: number): AudioBuffer {
    const sampleCount = Math.max(1, Math.floor(this.context.sampleRate * seconds));
    const buffer = this.context.createBuffer(1, sampleCount, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }

    return buffer;
  }
}
