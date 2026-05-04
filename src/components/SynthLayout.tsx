import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import type { MeterSnapshot } from '../types/synth';
import { selectEngineState, useSynthStore } from '../store/synthStore';
import { TopBar } from './TopBar';
import { Keyboard } from './Keyboard';
import { OscillatorPanel } from './OscillatorPanel';
import { FilterPanel } from './FilterPanel';
import { EnvelopePanel } from './EnvelopePanel';
import { PresetBrowser } from './PresetBrowser';
import { SamplePresetBrowser } from './SamplePresetBrowser';
import { LFOPanel } from './LFOPanel';
import { VectorMixerPanel } from './VectorMixerPanel';
import { WaveSequencerPanel } from './WaveSequencerPanel';
import { EffectsPanel } from './EffectsPanel';

const silentMeter: MeterSnapshot = { peak: 0, rms: 0, clipping: false, audioState: 'unavailable', activeVoices: 0 };
const PANEL_LAYOUT_KEY = 'wave-vector-hybrid-synth:panel-layout';

type MovablePanelId = 'oscillators' | 'filter' | 'envelopes' | 'presets' | 'samples' | 'lfo' | 'vector' | 'waveSeq' | 'effects';

const defaultPanelOrder: MovablePanelId[] = ['oscillators', 'filter', 'envelopes', 'presets', 'samples', 'lfo', 'vector', 'waveSeq', 'effects'];

const panelLabels: Record<MovablePanelId, string> = {
  oscillators: 'Oscillators',
  filter: 'Filter',
  envelopes: 'Envelopes',
  presets: 'Presets',
  samples: 'Samples',
  lfo: 'LFO',
  vector: 'Vector',
  waveSeq: 'Wave Seq',
  effects: 'Effects',
};

function readPanelOrder(): MovablePanelId[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PANEL_LAYOUT_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) {
      return defaultPanelOrder;
    }
    const next = parsed.filter((value): value is MovablePanelId => defaultPanelOrder.includes(value as MovablePanelId));
    if (next.length !== defaultPanelOrder.length) {
      return defaultPanelOrder;
    }
    return next;
  } catch {
    return defaultPanelOrder;
  }
}

function reorderPanelOrder(order: MovablePanelId[], source: MovablePanelId, target: MovablePanelId, placeAfter: boolean): MovablePanelId[] {
  if (source === target) {
    return order;
  }

  const sourceIndex = order.indexOf(source);
  const targetIndex = order.indexOf(target);
  if (sourceIndex < 0 || targetIndex < 0) {
    return order;
  }

  const next = [...order];
  const [panel] = next.splice(sourceIndex, 1);
  const adjustedTargetIndex = next.indexOf(target);
  next.splice(adjustedTargetIndex + (placeAfter ? 1 : 0), 0, panel);
  return next;
}

export function SynthLayout() {
  const engineRef = useRef<AudioEngine | null>(null);
  const testToneTimerRef = useRef<number | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [meter, setMeter] = useState<MeterSnapshot>(silentMeter);
  const [panelOrder, setPanelOrder] = useState<MovablePanelId[]>(readPanelOrder);
  const [draggedPanel, setDraggedPanel] = useState<MovablePanelId | null>(null);
  const [dropTargetPanel, setDropTargetPanel] = useState<MovablePanelId | null>(null);
  const setActiveNote = useSynthStore((state) => state.setActiveNote);
  const clearActiveNote = useSynthStore((state) => state.clearActiveNote);
  const clearActiveNotes = useSynthStore((state) => state.clearActiveNotes);

  useEffect(() => {
    try {
      const engine = new AudioEngine(selectEngineState(useSynthStore.getState()));
      engineRef.current = engine;
      const unsubscribe = useSynthStore.subscribe((state) => {
        engine.setState(selectEngineState(state));
      });

      return () => {
        unsubscribe();
        if (testToneTimerRef.current !== null) {
          window.clearTimeout(testToneTimerRef.current);
          testToneTimerRef.current = null;
        }
        engine.close();
        engineRef.current = null;
      };
    } catch (error) {
      setEngineError(error instanceof Error ? error.message : 'Audio engine failed to start.');
      return undefined;
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMeter(engineRef.current?.getAnalyserData() ?? silentMeter);
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(panelOrder));
    } catch {
      // Layout persistence is optional; panel movement still works without storage.
    }
  }, [panelOrder]);

  const handleNoteOn = useCallback(
    (note: number, velocity: number) => {
      setActiveNote(note, velocity);
      void engineRef.current?.noteOn(note, velocity);
    },
    [setActiveNote],
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      clearActiveNote(note);
      engineRef.current?.noteOff(note);
    },
    [clearActiveNote],
  );

  const handlePanic = useCallback(() => {
    if (testToneTimerRef.current !== null) {
      window.clearTimeout(testToneTimerRef.current);
      testToneTimerRef.current = null;
    }
    engineRef.current?.panic();
    clearActiveNotes();
  }, [clearActiveNotes]);

  const handleTestTone = useCallback(() => {
    const note = 72;
    const velocity = 0.82;

    if (testToneTimerRef.current !== null) {
      window.clearTimeout(testToneTimerRef.current);
      clearActiveNote(note);
    }

    setActiveNote(note, velocity);
    void engineRef.current?.noteOn(note, velocity);

    testToneTimerRef.current = window.setTimeout(() => {
      engineRef.current?.noteOff(note);
      clearActiveNote(note);
      testToneTimerRef.current = null;
    }, 650);
  }, [clearActiveNote, setActiveNote]);

  const handlePanelDragStart = useCallback((event: DragEvent<HTMLButtonElement>, panelId: MovablePanelId) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', panelId);
    setDraggedPanel(panelId);
  }, []);

  const handlePanelDragEnd = useCallback(() => {
    setDraggedPanel(null);
    setDropTargetPanel(null);
  }, []);

  const handlePanelDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>, panelId: MovablePanelId) => {
      if (!draggedPanel || draggedPanel === panelId) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDropTargetPanel(panelId);
    },
    [draggedPanel],
  );

  const handlePanelDrop = useCallback(
    (event: DragEvent<HTMLDivElement>, panelId: MovablePanelId) => {
      event.preventDefault();
      const source = (event.dataTransfer.getData('text/plain') || draggedPanel) as MovablePanelId | null;
      if (!source || !defaultPanelOrder.includes(source) || source === panelId) {
        handlePanelDragEnd();
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const horizontal = rect.width > rect.height;
      const placeAfter = horizontal ? event.clientX > rect.left + rect.width / 2 : event.clientY > rect.top + rect.height / 2;
      setPanelOrder((order) => reorderPanelOrder(order, source, panelId, placeAfter));
      handlePanelDragEnd();
    },
    [draggedPanel, handlePanelDragEnd],
  );

  const handlePanelKeyMove = useCallback((panelId: MovablePanelId, direction: -1 | 1) => {
    setPanelOrder((order) => {
      const index = order.indexOf(panelId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= order.length) {
        return order;
      }
      const next = [...order];
      const [panel] = next.splice(index, 1);
      next.splice(target, 0, panel);
      return next;
    });
  }, []);

  const renderPanel = (panelId: MovablePanelId) => {
    if (panelId === 'oscillators') {
      return <OscillatorPanel />;
    }
    if (panelId === 'filter') {
      return <FilterPanel />;
    }
    if (panelId === 'envelopes') {
      return <EnvelopePanel />;
    }
    if (panelId === 'presets') {
      return <PresetBrowser meter={meter} />;
    }
    if (panelId === 'samples') {
      return <SamplePresetBrowser />;
    }
    if (panelId === 'lfo') {
      return <LFOPanel />;
    }
    if (panelId === 'vector') {
      return <VectorMixerPanel />;
    }
    if (panelId === 'waveSeq') {
      return <WaveSequencerPanel />;
    }
    return <EffectsPanel />;
  };

  return (
    <main className="synth-workbench min-h-screen p-2 text-slate-100 md:p-3">
      <div className="hardware-shell flex w-full max-w-none flex-col gap-4 p-3 md:p-4">
        <TopBar onPanic={handlePanic} onTestTone={handleTestTone} meter={meter} />

        {engineError ? (
          <div className="panel border-amber-400/40 p-4 text-sm text-amber-100">{engineError}</div>
        ) : (
          <>
            <section className="movable-console-grid" aria-label="Movable synth panels">
              {panelOrder.map((panelId) => (
                <div
                  key={panelId}
                  className={`movable-panel-frame movable-panel-${panelId} ${draggedPanel === panelId ? 'is-dragging' : ''} ${dropTargetPanel === panelId ? 'is-drop-target' : ''}`}
                  onDragOver={(event) => handlePanelDragOver(event, panelId)}
                  onDragLeave={() => setDropTargetPanel((current) => (current === panelId ? null : current))}
                  onDrop={(event) => handlePanelDrop(event, panelId)}
                >
                  <div className="panel-drag-controls" aria-label={`${panelLabels[panelId]} drag layout controls`}>
                    <button
                      type="button"
                      className="panel-drag-handle"
                      draggable
                      onDragStart={(event) => handlePanelDragStart(event, panelId)}
                      onDragEnd={handlePanelDragEnd}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                          event.preventDefault();
                          handlePanelKeyMove(panelId, -1);
                        }
                        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                          event.preventDefault();
                          handlePanelKeyMove(panelId, 1);
                        }
                      }}
                      aria-label={`${panelLabels[panelId]} drag to move panel`}
                    >
                      <span className="drag-grip-dots" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </span>
                    </button>
                    <span>{panelLabels[panelId]}</span>
                  </div>
                  {renderPanel(panelId)}
                </div>
              ))}
            </section>
            <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
          </>
        )}
      </div>
    </main>
  );
}
