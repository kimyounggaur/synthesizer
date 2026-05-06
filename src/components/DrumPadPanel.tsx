import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { drumPadMap, type DrumPadDefinition, type DrumSoundId } from '../audio/drumKit';
import { MiniDisplay } from './ui/MiniDisplay';
import { SectionPanel } from './ui/SectionPanel';

interface DrumPadPanelProps {
  onTrigger: (sound: DrumSoundId, velocity: number) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function DrumPadPanel({ onTrigger }: DrumPadPanelProps) {
  const [activePads, setActivePads] = useState<Set<number>>(() => new Set());
  const [lastPad, setLastPad] = useState<DrumPadDefinition>(drumPadMap[12]);
  const timersRef = useRef(new Map<number, number>());
  const keyMap = useMemo(() => new Map(drumPadMap.map((pad) => [pad.keyCode, pad])), []);

  const triggerPad = useCallback(
    (pad: DrumPadDefinition, velocity = 0.96) => {
      const existingTimer = timersRef.current.get(pad.id);
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer);
      }

      setLastPad(pad);
      setActivePads((current) => {
        const next = new Set(current);
        next.add(pad.id);
        return next;
      });
      onTrigger(pad.sound, velocity);

      const timer = window.setTimeout(() => {
        timersRef.current.delete(pad.id);
        setActivePads((current) => {
          const next = new Set(current);
          next.delete(pad.id);
          return next;
        });
      }, 150);
      timersRef.current.set(pad.id, timer);
    },
    [onTrigger],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isEditableTarget(event.target)) {
        return;
      }

      const pad = keyMap.get(event.code);
      if (!pad) {
        return;
      }

      event.preventDefault();
      triggerPad(pad);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [keyMap, triggerPad]);

  return (
    <SectionPanel title="Drum Pads" eyebrow="M-Audio Code 49 pad bank" accent="violet" className="drum-pad-panel">
      <div className="drum-pad-shell">
        <MiniDisplay eyebrow="Drum map" value={lastPad.name.toUpperCase()} detail={`Pad ${lastPad.id} / Key ${lastPad.keyLabel}`} tone="cyan" />
        <div className="drum-pad-grid" aria-label="M-Audio Code 49 style drum pads">
          {drumPadMap.map((pad) => {
            const active = activePads.has(pad.id);
            return (
              <button
                key={pad.id}
                type="button"
                className={`drum-pad drum-pad-${pad.rowTone} ${active ? 'is-active' : ''}`}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  triggerPad(pad);
                }}
                aria-label={`Pad ${pad.id} ${pad.name} key ${pad.keyLabel}`}
              >
                <span className="drum-pad-number">{pad.id}</span>
                <span className="drum-pad-name">{pad.name}</span>
                <span className="drum-pad-key">{pad.keyLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </SectionPanel>
  );
}
