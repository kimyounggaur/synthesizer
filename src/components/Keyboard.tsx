import { useEffect, useMemo, useRef } from 'react';
import { useSynthStore } from '../store/synthStore';

interface KeyboardProps {
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
}

const chromaticNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const visibleKeyCount = 61;

const computerKeyboardRows = [
  [
    ['Backquote', '`'],
    ['Digit1', '1'],
    ['Digit2', '2'],
    ['Digit3', '3'],
    ['Digit4', '4'],
    ['Digit5', '5'],
    ['Digit6', '6'],
    ['Digit7', '7'],
    ['Digit8', '8'],
    ['Digit9', '9'],
    ['Digit0', '0'],
    ['Minus', '-'],
    ['Equal', '='],
  ],
  [
    ['KeyQ', 'Q'],
    ['KeyW', 'W'],
    ['KeyE', 'E'],
    ['KeyR', 'R'],
    ['KeyT', 'T'],
    ['KeyY', 'Y'],
    ['KeyU', 'U'],
    ['KeyI', 'I'],
    ['KeyO', 'O'],
    ['KeyP', 'P'],
    ['BracketLeft', '['],
    ['BracketRight', ']'],
    ['Backslash', '\\'],
  ],
  [
    ['KeyA', 'A'],
    ['KeyS', 'S'],
    ['KeyD', 'D'],
    ['KeyF', 'F'],
    ['KeyG', 'G'],
    ['KeyH', 'H'],
    ['KeyJ', 'J'],
    ['KeyK', 'K'],
    ['KeyL', 'L'],
    ['Semicolon', ';'],
    ['Quote', "'"],
  ],
  [
    ['KeyZ', 'Z'],
    ['KeyX', 'X'],
    ['KeyC', 'C'],
    ['KeyV', 'V'],
    ['KeyB', 'B'],
    ['KeyN', 'N'],
    ['KeyM', 'M'],
    ['Comma', ','],
    ['Period', '.'],
    ['Slash', '/'],
  ],
  [
    ['NumpadDivide', 'N/'],
    ['NumpadMultiply', 'N*'],
    ['NumpadSubtract', 'N-'],
    ['Numpad7', 'N7'],
    ['Numpad8', 'N8'],
    ['Numpad9', 'N9'],
    ['NumpadAdd', 'N+'],
    ['Numpad4', 'N4'],
    ['Numpad5', 'N5'],
    ['Numpad6', 'N6'],
    ['Numpad1', 'N1'],
    ['Numpad2', 'N2'],
    ['Numpad3', 'N3'],
    ['Numpad0', 'N0'],
  ],
] as const;

const computerKeys = computerKeyboardRows.flat().slice(0, visibleKeyCount);
const computerMap = new Map<string, number>(computerKeys.map(([code], offset) => [code, offset]));
const computerKeyLabels = new Map<number, string>(computerKeys.map(([, label], offset) => [offset, label]));

function isBlack(note: number): boolean {
  return [1, 3, 6, 8, 10].includes(note % 12);
}

function noteName(note: number): string {
  const octave = Math.floor(note / 12) - 1;
  return `${chromaticNames[note % 12]}${octave}`;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function Keyboard({ onNoteOn, onNoteOff }: KeyboardProps) {
  const keyboardOctave = useSynthStore((state) => state.keyboardOctave);
  const defaultVelocity = useSynthStore((state) => state.defaultVelocity);
  const activeNotes = useSynthStore((state) => state.activeNotes);
  const setKeyboardOctave = useSynthStore((state) => state.setKeyboardOctave);
  const setDefaultVelocity = useSynthStore((state) => state.setDefaultVelocity);
  const heldKeys = useRef(new Map<string, number>());

  const notes = useMemo(() => {
    const base = (keyboardOctave + 1) * 12;
    return Array.from({ length: visibleKeyCount }, (_, index) => base + index);
  }, [keyboardOctave]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.code;
      if (event.repeat) {
        return;
      }

      if (key === 'PageDown') {
        event.preventDefault();
        setKeyboardOctave(keyboardOctave - 1);
        return;
      }

      if (key === 'PageUp') {
        event.preventDefault();
        setKeyboardOctave(keyboardOctave + 1);
        return;
      }

      const offset = computerMap.get(key);
      if (offset === undefined) {
        return;
      }

      event.preventDefault();
      const note = (keyboardOctave + 1) * 12 + offset;
      heldKeys.current.set(key, note);
      onNoteOn(note, defaultVelocity);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.code;
      const note = heldKeys.current.get(key);
      if (note === undefined) {
        return;
      }
      event.preventDefault();
      heldKeys.current.delete(key);
      onNoteOff(note);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [defaultVelocity, keyboardOctave, onNoteOff, onNoteOn, setKeyboardOctave]);

  return (
    <section className="panel grid gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title">Keyboard</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button className="soft-button h-9 px-3" onClick={() => setKeyboardOctave(keyboardOctave - 1)}>
            Oct -
          </button>
          <div className="lcd px-3 py-2 font-mono text-sm">OCT {keyboardOctave}</div>
          <button className="soft-button h-9 px-3" onClick={() => setKeyboardOctave(keyboardOctave + 1)}>
            Oct +
          </button>
          <label className="grid w-36 gap-1">
            <span className="control-label">Velocity</span>
            <input
              className="range"
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={defaultVelocity}
              onChange={(event) => setDefaultVelocity(Number(event.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="keyboard-bed">
        {notes.map((note) => {
          const black = isBlack(note);
          const active = activeNotes[note] !== undefined;
          const velocity = activeNotes[note] ?? 0;
          const keyLabel = computerKeyLabels.get(note - (keyboardOctave + 1) * 12);
          return (
            <button
              key={note}
              className={`keyboard-key ${black ? 'is-black' : 'is-white'} ${active ? 'is-active' : ''} relative px-1 pb-3 font-mono text-[0.68rem] ${
                black
                  ? 'bg-slate-950 text-slate-400 shadow-inner'
                  : 'bg-slate-200 text-slate-950'
              }`}
              style={{
                ['--key-velocity' as string]: velocity,
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                onNoteOn(note, defaultVelocity);
              }}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture(event.pointerId);
                onNoteOff(note);
              }}
              onPointerCancel={() => onNoteOff(note)}
              onPointerLeave={(event) => {
                if (event.buttons > 0) {
                  onNoteOff(note);
                }
              }}
            >
              <span className="keyboard-shortcut-label">{keyLabel}</span>
              <span className="keyboard-note-label">{noteName(note)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
