import type { WaveSequencerState, WaveStep } from '../types/synth';

export type WaveStepCallback = (step: WaveStep, index: number) => void;

export class WaveSequencer {
  private state: WaveSequencerState;
  private timer: number | null = null;
  private index = 0;

  constructor(state: WaveSequencerState) {
    this.state = state;
  }

  update(state: WaveSequencerState): void {
    this.state = state;
    this.index = Math.min(this.index, Math.max(0, state.steps.length - 1));
  }

  start(callback: WaveStepCallback): void {
    this.stop();
    if (!this.state.enabled || this.state.steps.length === 0) {
      return;
    }
    this.tick(callback);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private tick(callback: WaveStepCallback): void {
    const playableSteps = this.state.steps.filter((step) => !step.skip);
    if (playableSteps.length === 0) {
      return;
    }

    const step = playableSteps[this.index % playableSteps.length];
    callback(step, this.index % playableSteps.length);
    this.index = (this.index + 1) % playableSteps.length;
    this.timer = window.setTimeout(() => this.tick(callback), Math.max(20, step.duration));
  }
}
