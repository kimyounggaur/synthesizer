import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MidiManager, type MidiDeviceInfo } from '../audio/MidiManager';

interface MidiPanelProps {
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
  onPanic: () => void;
}

type MidiStatus = 'unsupported' | 'idle' | 'requesting' | 'connected' | 'empty' | 'error';

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function formatNote(note: number): string {
  return `${noteNames[note % 12]}${Math.floor(note / 12) - 1}`;
}

function getStatusLabel(status: MidiStatus): string {
  if (status === 'unsupported') {
    return 'UNSUPPORTED';
  }
  if (status === 'requesting') {
    return 'REQUESTING';
  }
  if (status === 'connected') {
    return 'CONNECTED';
  }
  if (status === 'empty') {
    return 'NO INPUT';
  }
  if (status === 'error') {
    return 'ERROR';
  }
  return 'STANDBY';
}

export function MidiPanel({ onNoteOn, onNoteOff, onPanic }: MidiPanelProps) {
  const managerRef = useRef<MidiManager | null>(null);
  const activeNotesRef = useRef(new Set<number>());
  const sustainedNotesRef = useRef(new Set<number>());
  const sustainRef = useRef(false);
  const [inputs, setInputs] = useState<MidiDeviceInfo[]>([]);
  const [selectedInputId, setSelectedInputId] = useState('');
  const [status, setStatus] = useState<MidiStatus>('idle');
  const [lastEvent, setLastEvent] = useState('Ready');

  const supported = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }
    managerRef.current ??= new MidiManager();
    return managerRef.current.supported;
  }, []);

  const releaseAllMidiNotes = useCallback(() => {
    activeNotesRef.current.forEach((note) => onNoteOff(note));
    sustainedNotesRef.current.forEach((note) => onNoteOff(note));
    activeNotesRef.current.clear();
    sustainedNotesRef.current.clear();
    sustainRef.current = false;
  }, [onNoteOff]);

  const handleNoteOn = useCallback(
    (note: number, velocity: number) => {
      sustainedNotesRef.current.delete(note);
      activeNotesRef.current.add(note);
      setLastEvent(`NOTE ${formatNote(note)} ${Math.round(velocity * 127)}`);
      onNoteOn(note, velocity);
    },
    [onNoteOn],
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      activeNotesRef.current.delete(note);
      setLastEvent(`OFF ${formatNote(note)}`);
      if (sustainRef.current) {
        sustainedNotesRef.current.add(note);
        return;
      }
      onNoteOff(note);
    },
    [onNoteOff],
  );

  const handleSustain = useCallback(
    (enabled: boolean) => {
      sustainRef.current = enabled;
      setLastEvent(enabled ? 'SUSTAIN ON' : 'SUSTAIN OFF');
      if (enabled) {
        return;
      }
      sustainedNotesRef.current.forEach((note) => {
        if (!activeNotesRef.current.has(note)) {
          onNoteOff(note);
        }
      });
      sustainedNotesRef.current.clear();
    },
    [onNoteOff],
  );

  const refreshInputs = useCallback((devices: MidiDeviceInfo[]) => {
    const connectedInputs = devices.filter((device) => device.state === 'connected');
    setInputs(connectedInputs);
    setStatus(connectedInputs.length > 0 ? 'connected' : 'empty');
    setSelectedInputId((current) => {
      if (current && connectedInputs.some((device) => device.id === current)) {
        return current;
      }
      const nextId = connectedInputs[0]?.id ?? '';
      managerRef.current?.setInput(nextId || null);
      return nextId;
    });
  }, []);

  const handleConnect = useCallback(async () => {
    if (!supported) {
      setStatus('unsupported');
      setLastEvent('Use Chrome/Edge');
      return;
    }

    try {
      setStatus('requesting');
      setLastEvent('Permission');
      managerRef.current ??= new MidiManager();
      const devices = await managerRef.current.requestAccess(
        {
          noteOn: handleNoteOn,
          noteOff: handleNoteOff,
          sustain: handleSustain,
          pitchBend: (value) => setLastEvent(`BEND ${Math.round(value * 100)}%`),
          modWheel: (value) => setLastEvent(`MOD ${Math.round(value * 100)}%`),
        },
        refreshInputs,
      );
      refreshInputs(devices);
    } catch (error) {
      releaseAllMidiNotes();
      setStatus('error');
      setLastEvent(error instanceof Error ? error.name : 'Denied');
    }
  }, [handleNoteOff, handleNoteOn, handleSustain, refreshInputs, releaseAllMidiNotes, supported]);

  const handleDisconnect = useCallback(() => {
    releaseAllMidiNotes();
    managerRef.current?.disconnect();
    setInputs([]);
    setSelectedInputId('');
    setStatus('idle');
    setLastEvent('Disconnected');
    onPanic();
  }, [onPanic, releaseAllMidiNotes]);

  useEffect(() => {
    if (!supported) {
      setStatus('unsupported');
    }
    return () => {
      releaseAllMidiNotes();
      managerRef.current?.disconnect();
    };
  }, [releaseAllMidiNotes, supported]);

  const selectedInput = inputs.find((input) => input.id === selectedInputId);

  return (
    <div className={`performance-strip-section midi-performance-section midi-state-${status}`} aria-label="USB MIDI input">
      <span className="workstation-led-dot midi-panel-led" aria-hidden="true" />
      <div className="midi-panel-status">
        <span>USB MIDI</span>
        <strong>{getStatusLabel(status)}</strong>
        <em>{selectedInput ? selectedInput.name : lastEvent}</em>
      </div>
      <select
        className="panel-input midi-device-select"
        value={selectedInputId}
        disabled={inputs.length === 0 || status === 'requesting'}
        onChange={(event) => {
          const inputId = event.target.value;
          setSelectedInputId(inputId);
          managerRef.current?.setInput(inputId || null);
          setLastEvent(inputId ? 'Input selected' : 'All inputs');
        }}
        aria-label="USB MIDI input device"
      >
        {inputs.length === 0 ? <option value="">No MIDI input</option> : null}
        {inputs.map((input) => (
          <option key={input.id} value={input.id}>
            {input.name}
          </option>
        ))}
      </select>
      <button type="button" className="performance-button midi-connect-button" disabled={status === 'requesting' || status === 'unsupported'} onClick={status === 'connected' ? handleDisconnect : handleConnect}>
        {status === 'connected' ? 'OFF' : 'CONNECT'}
      </button>
    </div>
  );
}
