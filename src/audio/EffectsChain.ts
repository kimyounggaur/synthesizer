import type { EffectState, EffectType } from '../types/synth';

export interface EffectModule {
  id: string;
  type: EffectType;
  enabled: boolean;
  input: AudioNode;
  output: AudioNode;
  connect(destination: AudioNode): void;
  disconnect(): void;
  setParam(name: string, value: number): void;
}

export class EffectsChain {
  readonly input: GainNode;
  readonly output: GainNode;

  private readonly context: AudioContext;
  private effects: EffectState[] = [];
  private nodes: AudioNode[] = [];

  constructor(context: AudioContext, effects: EffectState[] = []) {
    this.context = context;
    this.input = context.createGain();
    this.output = context.createGain();
    this.effects = effects;
    this.rebuild();
  }

  update(effects: EffectState[]): void {
    this.effects = effects;
    this.rebuild();
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.input.disconnect();
    this.output.disconnect();
    this.disconnectNodes();
  }

  private rebuild(): void {
    this.disconnectNodes();

    let cursor: AudioNode = this.input;
    const activeEffects = this.effects.filter((effect) => effect.enabled);

    for (const effect of activeEffects) {
      const wet = this.context.createGain();
      const dry = this.context.createGain();
      const mix = this.context.createGain();
      const module = this.createModule(effect);

      const amount = Math.min(1, Math.max(0, effect.wet));
      wet.gain.value = amount;
      dry.gain.value = 1 - amount;

      cursor.connect(dry);
      dry.connect(mix);
      cursor.connect(module.input);
      module.output.connect(wet);
      wet.connect(mix);

      this.nodes.push(wet, dry, mix, ...module.nodes);
      cursor = mix;
    }

    cursor.connect(this.output);
  }

  private disconnectNodes(): void {
    for (const node of [this.input, ...this.nodes]) {
      try {
        node.disconnect();
      } catch {
        // Some nodes may already be disconnected after a rebuild.
      }
    }
    this.nodes = [];
  }

  private createModule(effect: EffectState): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
    if (effect.type === 'delay' || effect.type === 'flanger' || effect.type === 'chorus') {
      return this.createDelayModule(effect);
    }
    if (effect.type === 'distortion' || effect.type === 'bitcrusher') {
      return this.createDistortionModule(effect);
    }
    if (effect.type === 'reverb') {
      return this.createReverbModule(effect);
    }
    if (effect.type === 'phaser') {
      return this.createFilterModule(effect, 'allpass');
    }
    if (effect.type === 'eq') {
      return this.createFilterModule(effect, 'peaking');
    }
    if (effect.type === 'compressor') {
      return this.createCompressorModule(effect);
    }
    if (effect.type === 'autoPan') {
      return this.createAutoPanModule(effect);
    }
    return this.createDelayModule(effect);
  }

  private createDelayModule(effect: EffectState): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
    const input = this.context.createGain();
    const delay = this.context.createDelay(2);
    const feedback = this.context.createGain();
    const output = this.context.createGain();
    const baseTime = effect.type === 'flanger' ? 0.012 : effect.type === 'chorus' ? 0.026 : 0.28;

    delay.delayTime.value = Math.min(1.2, Math.max(0.002, effect.params.time ?? baseTime));
    feedback.gain.value = Math.min(0.86, Math.max(0, effect.params.feedback ?? 0.28));

    input.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(output);
    return { input, output, nodes: [input, delay, feedback, output] };
  }

  private createDistortionModule(effect: EffectState): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
    const input = this.context.createGain();
    const shaper = this.context.createWaveShaper();
    const output = this.context.createGain();
    const drive = Math.max(1, (effect.params.drive ?? 0.45) * 40 + 1);
    const samples = 512;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i += 1) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = effect.type === 'bitcrusher' ? Math.round(x * drive) / drive : ((1 + drive) * x) / (1 + drive * Math.abs(x));
    }

    shaper.curve = curve;
    shaper.oversample = '2x';
    input.connect(shaper);
    shaper.connect(output);
    return { input, output, nodes: [input, shaper, output] };
  }

  private createReverbModule(effect: EffectState): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
    const input = this.context.createGain();
    const convolver = this.context.createConvolver();
    const output = this.context.createGain();
    convolver.buffer = this.createImpulse(effect.params.decay ?? 1.6);
    input.connect(convolver);
    convolver.connect(output);
    return { input, output, nodes: [input, convolver, output] };
  }

  private createFilterModule(effect: EffectState, type: BiquadFilterType): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
    const input = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const output = this.context.createGain();
    filter.type = type;
    filter.frequency.value = effect.params.frequency ?? 900;
    filter.Q.value = effect.params.q ?? 4;
    filter.gain.value = effect.params.gain ?? 0;
    input.connect(filter);
    filter.connect(output);
    return { input, output, nodes: [input, filter, output] };
  }

  private createCompressorModule(effect: EffectState): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
    const input = this.context.createGain();
    const compressor = this.context.createDynamicsCompressor();
    const output = this.context.createGain();
    compressor.threshold.value = effect.params.threshold ?? -22;
    compressor.ratio.value = effect.params.ratio ?? 4;
    input.connect(compressor);
    compressor.connect(output);
    return { input, output, nodes: [input, compressor, output] };
  }

  private createAutoPanModule(effect: EffectState): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
    const input = this.context.createGain();
    const panner = this.context.createStereoPanner();
    const output = this.context.createGain();
    const lfo = this.context.createOscillator();
    const depth = this.context.createGain();
    lfo.frequency.value = effect.params.rate ?? 0.45;
    depth.gain.value = Math.min(1, Math.max(0, effect.params.depth ?? 0.65));
    lfo.connect(depth);
    depth.connect(panner.pan);
    lfo.start();
    input.connect(panner);
    panner.connect(output);
    return { input, output, nodes: [input, panner, output, lfo, depth] };
  }

  private createImpulse(decay: number): AudioBuffer {
    const seconds = Math.min(5, Math.max(0.2, decay));
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(2, length, this.context.sampleRate);

    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
      }
    }

    return buffer;
  }
}
