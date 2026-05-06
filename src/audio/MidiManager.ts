export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  connection: MIDIPortConnectionState;
  state: MIDIPortDeviceState;
}

export interface MidiCallbacks {
  noteOn(note: number, velocity: number): void;
  noteOff(note: number): void;
  pitchBend?(value: number): void;
  modWheel?(value: number): void;
  sustain?(value: boolean): void;
}

export class MidiManager {
  private access: MIDIAccess | null = null;
  private callbacks: MidiCallbacks | null = null;
  private selectedInputId: string | null = null;
  private devicesChangeHandler: ((devices: MidiDeviceInfo[]) => void) | null = null;

  get supported(): boolean {
    return typeof navigator.requestMIDIAccess === 'function';
  }

  async requestAccess(callbacks: MidiCallbacks, onDevicesChange?: (devices: MidiDeviceInfo[]) => void): Promise<MidiDeviceInfo[]> {
    const requestMIDIAccess = navigator.requestMIDIAccess;
    if (!requestMIDIAccess) {
      throw new Error('Web MIDI API is not supported in this browser.');
    }

    this.callbacks = callbacks;
    this.devicesChangeHandler = onDevicesChange ?? null;
    this.access = await requestMIDIAccess({ sysex: false });
    this.access.onstatechange = () => {
      this.bindInputs();
      this.devicesChangeHandler?.(this.getInputs());
    };
    this.bindInputs();

    return this.getInputs();
  }

  setInput(inputId: string | null): void {
    this.selectedInputId = inputId;
    this.bindInputs();
  }

  getInputs(): MidiDeviceInfo[] {
    if (!this.access) {
      return [];
    }

    return Array.from(this.access.inputs.values()).map((input) => ({
      id: input.id,
      name: input.name ?? 'MIDI Input',
      manufacturer: input.manufacturer ?? 'Unknown',
      connection: input.connection,
      state: input.state,
    }));
  }

  disconnect(): void {
    if (!this.access) {
      return;
    }
    this.access.inputs.forEach((input) => {
      input.onmidimessage = null;
    });
    this.access.onstatechange = null;
    this.access = null;
    this.callbacks = null;
    this.devicesChangeHandler = null;
    this.selectedInputId = null;
  }

  private bindInputs(): void {
    if (!this.access) {
      return;
    }

    this.access.inputs.forEach((input) => {
      const shouldListen = this.selectedInputId === null || input.id === this.selectedInputId;
      input.onmidimessage = shouldListen && input.state === 'connected' ? (event) => this.handleMessage(event) : null;
    });
  }

  private handleMessage(event: MIDIMessageEvent): void {
    const data = event.data;
    if (!data || data.length < 2 || !this.callbacks) {
      return;
    }

    const status = data[0] & 0xf0;
    const note = data[1];
    const value = data[2] ?? 0;

    if (status === 0x90 && value > 0) {
      this.callbacks.noteOn(note, value / 127);
    } else if (status === 0x80 || (status === 0x90 && value === 0)) {
      this.callbacks.noteOff(note);
    } else if (status === 0xe0 && data.length >= 3) {
      const bend = ((value << 7) + note - 8192) / 8192;
      this.callbacks.pitchBend?.(bend);
    } else if (status === 0xb0 && note === 1) {
      this.callbacks.modWheel?.(value / 127);
    } else if (status === 0xb0 && note === 64) {
      this.callbacks.sustain?.(value >= 64);
    }
  }
}
