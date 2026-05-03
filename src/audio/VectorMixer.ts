import { clamp } from '../utils/audioMath';

export interface VectorLevels {
  a: number;
  b: number;
  c: number;
  d: number;
}

export class VectorMixer {
  readonly inputA: GainNode;
  readonly inputB: GainNode;
  readonly inputC: GainNode;
  readonly inputD: GainNode;
  readonly output: GainNode;

  private readonly context: AudioContext;
  private levels: VectorLevels = { a: 1, b: 1, c: 0, d: 0 };
  private x = 0.5;
  private y = 0;

  constructor(context: AudioContext) {
    this.context = context;
    this.inputA = context.createGain();
    this.inputB = context.createGain();
    this.inputC = context.createGain();
    this.inputD = context.createGain();
    this.output = context.createGain();

    this.inputA.connect(this.output);
    this.inputB.connect(this.output);
    this.inputC.connect(this.output);
    this.inputD.connect(this.output);
    this.updateGains();
  }

  setPosition(x: number, y: number): void {
    this.x = clamp(x, 0, 1);
    this.y = clamp(y, 0, 1);
    this.updateGains();
  }

  setLevels(levels: VectorLevels): void {
    this.levels = {
      a: clamp(levels.a, 0, 1),
      b: clamp(levels.b, 0, 1),
      c: clamp(levels.c, 0, 1),
      d: clamp(levels.d, 0, 1),
    };
    this.updateGains();
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
    this.inputA.disconnect();
    this.inputB.disconnect();
    this.inputC.disconnect();
    this.inputD.disconnect();
  }

  static calculateWeights(x: number, y: number): VectorLevels {
    const safeX = clamp(x, 0, 1);
    const safeY = clamp(y, 0, 1);
    return {
      a: (1 - safeX) * (1 - safeY),
      b: safeX * (1 - safeY),
      c: (1 - safeX) * safeY,
      d: safeX * safeY,
    };
  }

  private updateGains(): void {
    const now = this.context.currentTime;
    const weights = VectorMixer.calculateWeights(this.x, this.y);
    this.inputA.gain.setTargetAtTime(weights.a * this.levels.a, now, 0.015);
    this.inputB.gain.setTargetAtTime(weights.b * this.levels.b, now, 0.015);
    this.inputC.gain.setTargetAtTime(weights.c * this.levels.c, now, 0.015);
    this.inputD.gain.setTargetAtTime(weights.d * this.levels.d, now, 0.015);
  }
}
