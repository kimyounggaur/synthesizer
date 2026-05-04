import { useEffect, useMemo, useState } from 'react';
import { loadPublicSampleBanks, sampleBankManager } from '../samples/sampleBankLibrary';
import { useSynthStore } from '../store/synthStore';
import type { EngineMode, SampleBankManifest, SampleCategory, SamplePresetDefinition } from '../types/soundfont';
import { Knob } from './ui/Knob';

type SampleFilter = SampleCategory | 'All';
type BankFilter = string | 'All';

interface BrowserSamplePreset {
  bankId: string;
  bankName: string;
  bankLicense: string;
  preset: SamplePresetDefinition;
}

const sampleCategoryOrder: SampleCategory[] = [
  'Piano',
  'E-Piano',
  'Organ',
  'Strings',
  'Choir',
  'Brass',
  'Woodwind',
  'Guitar',
  'Bass',
  'Bell',
  'Mallet',
  'Drum',
  'FX',
  'Experimental',
];

function formatTime(value: number): string {
  return value >= 1 ? `${value.toFixed(2)}s` : `${Math.round(value * 1000)}ms`;
}

function formatCutoff(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`;
}

function modeLabel(mode: EngineMode): string {
  return mode === 'synth' ? 'Synth' : mode === 'sample' ? 'Sample' : 'Hybrid';
}

export function SamplePresetBrowser() {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<SampleFilter>('All');
  const [selectedBankId, setSelectedBankId] = useState<BankFilter>('All');
  const [banks, setBanks] = useState<SampleBankManifest[]>(() => sampleBankManager.getBankManifests());
  const [sampleBankLoadError, setSampleBankLoadError] = useState<string | null>(null);
  const engineMode = useSynthStore((state) => state.engineMode);
  const sampleLayer = useSynthStore((state) => state.sampleLayer);
  const setEngineMode = useSynthStore((state) => state.setEngineMode);
  const updateSampleLayer = useSynthStore((state) => state.updateSampleLayer);
  const loadSamplePreset = useSynthStore((state) => state.loadSamplePreset);

  useEffect(() => {
    let mounted = true;
    loadPublicSampleBanks()
      .then(() => {
        if (mounted) {
          setBanks(sampleBankManager.getBankManifests());
          setSampleBankLoadError(null);
        }
      })
      .catch((error) => {
        if (mounted) {
          setSampleBankLoadError(error instanceof Error ? error.message : 'Sample bank manifest failed to load.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const presets = useMemo<BrowserSamplePreset[]>(
    () =>
      banks.flatMap((bank) =>
        bank.presets.map((preset) => ({
          bankId: bank.id,
          bankName: bank.name,
          bankLicense: bank.license,
          preset,
        })),
      ),
    [banks],
  );

  const categoryCounts = useMemo(
    () =>
      sampleCategoryOrder.map((category) => ({
        category,
        count: presets.filter((item) => item.preset.category === category).length,
      })),
    [presets],
  );

  const visiblePresets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return presets.filter((item) => {
      const matchesBank = selectedBankId === 'All' || item.bankId === selectedBankId;
      const matchesCategory = selectedFilter === 'All' || item.preset.category === selectedFilter;
      const searchable = `${item.preset.name} ${item.preset.category} ${item.preset.author} ${item.bankName}`.toLowerCase();
      return matchesBank && matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [presets, query, selectedBankId, selectedFilter]);

  const activePreset = sampleBankManager.getPreset(sampleLayer.bankId, sampleLayer.presetId);
  const activeBank = sampleBankManager.getBank(sampleLayer.bankId);

  return (
    <section className="panel sample-preset-panel">
      <div className="sample-preset-header">
        <div>
          <div className="sample-preset-eyebrow">Sample layer</div>
          <div className="sample-preset-title">{activePreset?.name ?? 'No Sample Loaded'}</div>
        </div>
        <div className="sample-engine-mode" aria-label="Engine mode">
          {(['synth', 'sample', 'hybrid'] as EngineMode[]).map((mode) => (
            <button key={mode} className={engineMode === mode ? 'sample-mode-button is-active' : 'sample-mode-button'} onClick={() => setEngineMode(mode)}>
              {modeLabel(mode)}
            </button>
          ))}
        </div>
      </div>

      <div className="sample-preset-body">
        <aside className="sample-preset-sidebar">
          <label className="compact-control">
            <span className="control-label">Bank</span>
            <select className="mini-select panel-select" value={selectedBankId} onChange={(event) => setSelectedBankId(event.target.value)}>
              <option value="All">All banks</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
          </label>

          <div className="sample-category-list">
            <button className={selectedFilter === 'All' ? 'sample-category-button is-active' : 'sample-category-button'} onClick={() => setSelectedFilter('All')}>
              <span>All Samples</span>
              <span>{presets.length}</span>
            </button>
            {categoryCounts.map(({ category, count }) => (
              <button
                key={category}
                className={selectedFilter === category ? 'sample-category-button is-active' : 'sample-category-button'}
                onClick={() => setSelectedFilter(category)}
              >
                <span>{category}</span>
                <span>{count}</span>
              </button>
            ))}
          </div>

          <div className="sample-switch-bank">
            <label className="sample-check-row">
              <input type="checkbox" checked={sampleLayer.enabled} onChange={(event) => updateSampleLayer({ enabled: event.target.checked })} />
              <span>Layer enabled</span>
            </label>
            <label className="sample-check-row">
              <input type="checkbox" checked={sampleLayer.oneShot} onChange={(event) => updateSampleLayer({ oneShot: event.target.checked })} />
              <span>One shot</span>
            </label>
            <label className="sample-check-row">
              <input type="checkbox" checked={sampleLayer.preload} onChange={(event) => updateSampleLayer({ preload: event.target.checked })} />
              <span>Preload</span>
            </label>
            {sampleBankLoadError ? <div className="sample-bank-error">{sampleBankLoadError}</div> : null}
          </div>
        </aside>

        <div className="sample-preset-main">
          <div className="sample-search-row">
            <div className="sample-search-meta">
              <span>{activeBank?.name ?? 'Sample bank'}</span>
              <span>{activePreset ? `${activePreset.category} / ${activePreset.author}` : `${visiblePresets.length} presets`}</span>
            </div>
            <input className="mini-input" value={query} placeholder="Search sample presets" onChange={(event) => setQuery(event.target.value)} />
          </div>

          <div className="sample-preset-content">
            <div className="sample-preset-list">
              {visiblePresets.map((item) => {
                const active = item.bankId === sampleLayer.bankId && item.preset.id === sampleLayer.presetId;
                return (
                  <div key={`${item.bankId}:${item.preset.id}`} className={active ? 'sample-preset-row is-active' : 'sample-preset-row'}>
                    <button className="sample-preset-load" onClick={() => loadSamplePreset(item.bankId, item.preset.id)}>
                      <span className="sample-preset-name">{item.preset.name}</span>
                      <span className="sample-preset-meta">
                        {item.preset.category} / {item.bankName}
                      </span>
                    </button>
                    <span className="sample-preset-zone-count">{item.preset.zones.length} zones</span>
                  </div>
                );
              })}
              {visiblePresets.length === 0 ? <div className="flex-empty-state">No sample presets found.</div> : null}
            </div>

            <div className="sample-layer-controls">
              <div className="sample-license-readout">
                <span>License</span>
                <strong>{activePreset?.license ?? activeBank?.license ?? 'Select a preset'}</strong>
              </div>

              <div className="sample-knob-grid">
                <Knob label="Level" min={0} max={1.5} step={0.01} value={sampleLayer.level} onChange={(value) => updateSampleLayer({ level: value })} displayValue={`${Math.round(sampleLayer.level * 100)}%`} tone="mint" />
                <Knob label="Attack" min={0.001} max={4} step={0.001} value={sampleLayer.attack} onChange={(value) => updateSampleLayer({ attack: value })} displayValue={formatTime(sampleLayer.attack)} tone="violet" />
                <Knob label="Decay" min={0.001} max={4} step={0.001} value={sampleLayer.decay} onChange={(value) => updateSampleLayer({ decay: value })} displayValue={formatTime(sampleLayer.decay)} tone="violet" />
                <Knob label="Sustain" min={0} max={1} step={0.01} value={sampleLayer.sustain} onChange={(value) => updateSampleLayer({ sustain: value })} displayValue={`${Math.round(sampleLayer.sustain * 100)}%`} tone="amber" />
                <Knob label="Release" min={0.001} max={6} step={0.001} value={sampleLayer.release} onChange={(value) => updateSampleLayer({ release: value })} displayValue={formatTime(sampleLayer.release)} tone="violet" />
              </div>

              <div className="sample-filter-row">
                <label className="sample-check-row">
                  <input type="checkbox" checked={sampleLayer.filterEnabled} onChange={(event) => updateSampleLayer({ filterEnabled: event.target.checked })} />
                  <span>Sample filter</span>
                </label>
                <div className="sample-filter-knobs">
                  <Knob label="Cutoff" min={24} max={20000} step={1} value={sampleLayer.filterCutoff} onChange={(value) => updateSampleLayer({ filterCutoff: value })} displayValue={formatCutoff(sampleLayer.filterCutoff)} tone="amber" />
                  <Knob label="Res" min={0.1} max={24} step={0.1} value={sampleLayer.filterResonance} onChange={(value) => updateSampleLayer({ filterResonance: value })} tone="amber" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
