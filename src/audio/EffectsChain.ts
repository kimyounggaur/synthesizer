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
  }

  private rebuild(): void {
    this.input.disconnect();
    this.output.disconnect();

    // MVP keeps the chain as a clean bypass lane. Individual modules can be inserted here.
    this.input.connect(this.output);
    void this.context;
    void this.effects;
  }
}
