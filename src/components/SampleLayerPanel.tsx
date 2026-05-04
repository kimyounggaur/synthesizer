import { useEffect, useMemo, useState } from 'react';
import { availableSampleBanks } from '../presets/samplePresets';
import { useSynthStore } from '../store/synthStore';
import type { EngineMode, SampleBankManifest } from '../types/soundfont';
import { loadSampleBankManifestForUi } from '../utils/sampleManifestLoader';
import { MiniDisplay } from './ui/MiniDisplay';
import { SectionPanel } from './ui/SectionPanel';

const engineModes: EngineMode[] = ['synth', 'sample', 'hybrid'];

function modeLabel(mode: EngineMode): string {
  return mode === 'synth' ? 'Synth' : mode === 'sample' ? 'Sample' : 'Hybrid';
}

function formatTime(value: number): string {
  return value >= 1 ? `${value.toFixed(2)}s` : `${Math.round(value * 1000)}ms`;
}

function formatCutoff(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function SampleLayerPanel() {
  const engineMode = useSynthStore((state) => state.engineMode);
  const sampleLayer = useSynthStore((state) => state.sampleLayer);
  const setEngineMode = useSynthStore((state) => state.setEngineMode);
  const updateSampleLayer = useSynthStore((state) => state.updateSampleLayer);
  const selectSamplePreset = useSynthStore((state) => state.selectSamplePreset);
  const [selectedBankId, setSelectedBankId] = useState(sampleLayer.bankId ?? availableSampleBanks[0]?.id ?? '');
  const [selectedPresetId, setSelectedPresetId] = useState(sampleLayer.presetId ?? '');
  const [manifest, setManifest] = useState<SampleBankManifest | null>(null);
  const [isLoadingManifest, setIsLoadingManifest] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (sampleLayer.bankId && sampleLayer.bankId !== selectedBankId) {
      setSelectedBankId(sampleLayer.bankId);
    }
  }, [sampleLayer.bankId, selectedBankId]);

  useEffect(() => {
    if (sampleLayer.presetId && sampleLayer.presetId !== selectedPresetId) {
      setSelectedPresetId(sampleLayer.presetId);
    }
  }, [sampleLayer.presetId, selectedPresetId]);

  useEffect(() => {
    if (!selectedBankId) {
      setManifest(null);
      setSelectedPresetId('');
      return undefined;
    }

    let cancelled = false;
    setIsLoadingManifest(true);
    setMessage(null);

    loadSampleBankManifestForUi(selectedBankId)
      .then((nextManifest) => {
        if (cancelled) {
          return;
        }
        setManifest(nextManifest);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setManifest(null);
        setSelectedPresetId('');
        setMessage(error instanceof Error ? error.message : 'Failed to load sample bank manifest.');
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingManifest(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBankId]);

  useEffect(() => {
    if (!manifest || sampleLayer.bankId !== selectedBankId || !sampleLayer.presetId) {
      return;
    }

    const hasCurrentPreset = manifest.presets.some((preset) => preset.id === sampleLayer.presetId);
    if (hasCurrentPreset) {
      setSelectedPresetId(sampleLayer.presetId);
    }
  }, [manifest, sampleLayer.bankId, sampleLayer.presetId, selectedBankId]);

  const selectedBank = useMemo(() => availableSampleBanks.find((bank) => bank.id === selectedBankId) ?? null, [selectedBankId]);
  const selectedPreset = useMemo(() => manifest?.presets.find((preset) => preset.id === selectedPresetId) ?? null, [manifest, selectedPresetId]);

  const handleBankChange = (bankId: string) => {
    setSelectedBankId(bankId);
    setSelectedPresetId('');
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (selectedBankId && presetId) {
      selectSamplePreset(selectedBankId, presetId);
      setMessage(null);
    }
  };

  const handlePreload = () => {
    if (!selectedBankId || !selectedPresetId) {
      setMessage('Select a sample preset before preloading.');
      return;
    }

    selectSamplePreset(selectedBankId, selectedPresetId);
    updateSampleLayer({ preload: true });
    setMessage('Preload requested for the selected sample preset.');
  };

  return (
    <SectionPanel title="Sample Bank" eyebrow="Sample layer" accent="mint" className="sample-layer-panel">
      <div className="sample-layer-grid">
        <div className="module-block module-block-cyan sample-layer-engine-block">
          <div className="module-inline-header">
            <MiniDisplay
              eyebrow="Engine Mode"
              value={modeLabel(engineMode)}
              detail={sampleLayer.enabled ? 'Sample layer enabled' : 'Sample layer bypassed'}
              tone="cyan"
            />
            <label className="sample-check-row">
              <input type="checkbox" checked={sampleLayer.enabled} onChange={(event) => updateSampleLayer({ enabled: event.target.checked })} />
              <span>Enabled</span>
            </label>
          </div>

          <div className="sample-engine-mode" aria-label="Engine Mode">
            {engineModes.map((mode) => (
              <button key={mode} type="button" className={engineMode === mode ? 'sample-mode-button is-active' : 'sample-mode-button'} onClick={() => setEngineMode(mode)}>
                {modeLabel(mode)}
              </button>
            ))}
          </div>
        </div>

        <div className="module-block module-block-mint sample-layer-bank-block">
          <div className="sample-layer-select-grid">
            <label className="compact-control">
              <span className="control-label">Bank</span>
              <select className="mini-select panel-select" value={selectedBankId} onChange={(event) => handleBankChange(event.target.value)}>
                {availableSampleBanks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="compact-control">
              <span className="control-label">Preset</span>
              <select className="mini-select panel-select" value={selectedPresetId} disabled={!manifest || isLoadingManifest} onChange={(event) => handlePresetChange(event.target.value)}>
                <option value="">{isLoadingManifest ? 'Loading presets...' : 'Select preset'}</option>
                {manifest?.presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="sample-layer-bank-meta">
            <span>{selectedBank?.description ?? manifest?.description ?? 'Sample bank manifest'}</span>
            <strong>{selectedPreset?.license ?? selectedBank?.license ?? manifest?.license ?? 'License unavailable'}</strong>
          </div>
        </div>

        <div className="module-block module-block-amber sample-layer-controls-block">
          <label className="sample-slider-row">
            <span>Level</span>
            <input className="range" type="range" min={0} max={1.5} step={0.01} value={sampleLayer.level} onChange={(event) => updateSampleLayer({ level: Number(event.target.value) })} />
            <strong>{formatPercent(sampleLayer.level)}</strong>
          </label>

          <label className="sample-slider-row">
            <span>Attack</span>
            <input className="range" type="range" min={0.001} max={4} step={0.001} value={sampleLayer.attack} onChange={(event) => updateSampleLayer({ attack: Number(event.target.value) })} />
            <strong>{formatTime(sampleLayer.attack)}</strong>
          </label>

          <label className="sample-slider-row">
            <span>Release</span>
            <input className="range" type="range" min={0.001} max={6} step={0.001} value={sampleLayer.release} onChange={(event) => updateSampleLayer({ release: Number(event.target.value) })} />
            <strong>{formatTime(sampleLayer.release)}</strong>
          </label>
        </div>

        <div className="module-block module-block-violet sample-layer-filter-block">
          <label className="sample-check-row">
            <input type="checkbox" checked={sampleLayer.filterEnabled} onChange={(event) => updateSampleLayer({ filterEnabled: event.target.checked })} />
            <span>Filter enabled</span>
          </label>

          <label className="sample-slider-row">
            <span>Filter cutoff</span>
            <input className="range" type="range" min={24} max={20000} step={1} value={sampleLayer.filterCutoff} onChange={(event) => updateSampleLayer({ filterCutoff: Number(event.target.value) })} />
            <strong>{formatCutoff(sampleLayer.filterCutoff)}</strong>
          </label>

          <button type="button" className="soft-button sample-preload-button" disabled={!selectedBankId || !selectedPresetId} onClick={handlePreload}>
            Preload
          </button>
        </div>

        {message ? <div className="sample-bank-error sample-layer-message">{message}</div> : null}
      </div>
    </SectionPanel>
  );
}
