import { useEffect, useMemo, useState } from 'react';
import { factoryPresets, presetCategoryOrder } from '../presets/factoryPresets';
import { usePresetStore } from '../store/presetStore';
import { selectEngineState, useSynthStore } from '../store/synthStore';
import type { MeterSnapshot, SynthPreset } from '../types/synth';
import { createUserPreset, exportPresets, parsePresetImport } from '../utils/presetStorage';

type PresetFilter = SynthPreset['category'] | 'All' | 'User';

interface PresetBrowserProps {
  meter: MeterSnapshot;
}

function MeterLine({ label, value, tone = 'normal' }: { label: string; value: number; tone?: 'normal' | 'hot' }) {
  return (
    <div className="flex-meter-line">
      <span>{label}</span>
      <div className="flex-meter-track">
        <div className={tone === 'hot' ? 'flex-meter-fill is-hot' : 'flex-meter-fill'} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function PresetBrowser({ meter }: PresetBrowserProps) {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<PresetFilter>('All');
  const [importText, setImportText] = useState('');
  const loadPreset = useSynthStore((state) => state.loadPreset);
  const savePresetMarker = useSynthStore((state) => state.savePreset);
  const currentPreset = useSynthStore((state) => state.currentPreset);
  const userPresets = usePresetStore((state) => state.userPresets);
  const loadUserPresets = usePresetStore((state) => state.loadUserPresets);
  const saveUserPreset = usePresetStore((state) => state.saveUserPreset);
  const deleteUserPreset = usePresetStore((state) => state.deleteUserPreset);
  const importUserPresets = usePresetStore((state) => state.importUserPresets);

  useEffect(() => {
    loadUserPresets();
  }, [loadUserPresets]);

  const allPresets = useMemo(() => [...factoryPresets, ...userPresets], [userPresets]);

  const categoryCounts = useMemo(
    () =>
      presetCategoryOrder
        .map((category) => ({
          category,
          count: allPresets.filter((preset) => preset.category === category).length,
        }))
        .filter(({ count }) => count > 0),
    [allPresets],
  );

  const presets = useMemo(() => {
    const filteredByLibrary =
      selectedFilter === 'All'
        ? allPresets
        : selectedFilter === 'User'
          ? allPresets.filter((preset) => preset.author === 'User')
          : allPresets.filter((preset) => preset.category === selectedFilter);

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return filteredByLibrary;
    }
    return filteredByLibrary.filter((preset) => `${preset.name} ${preset.category} ${preset.author}`.toLowerCase().includes(normalizedQuery));
  }, [allPresets, query, selectedFilter]);

  const handleSave = () => {
    const name = window.prompt('Preset name');
    if (!name?.trim()) {
      return;
    }
    const preset = createUserPreset(name.trim(), selectEngineState(useSynthStore.getState()));
    saveUserPreset(preset);
    savePresetMarker(preset.id);
  };

  const handleExport = async () => {
    const exported = exportPresets(userPresets);
    setImportText(exported);
    try {
      await navigator.clipboard.writeText(exported);
    } catch {
      window.alert('Clipboard permission was blocked. Export JSON has been placed in the preset text box.');
    }
  };

  const handleImport = () => {
    try {
      importUserPresets(parsePresetImport(importText));
      setImportText('');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Preset import failed.');
    }
  };

  const peak = Math.min(100, meter.peak * 100);
  const rms = Math.min(100, meter.rms * 160);
  const activeFilterLabel = selectedFilter === 'All' ? 'All Presets' : selectedFilter === 'User' ? 'User Presets' : selectedFilter;

  return (
    <section className="panel flex-preset-panel">
      <div className="flex-preset-header">
        <div className="flex-preset-tabs" aria-label="Preset browser tabs">
          <span className="is-active">Library</span>
          <span>Store</span>
        </div>
        <div className="flex-preset-heading">
          <span>Presets</span>
          <span>{presets.length}</span>
        </div>
      </div>

      <div className="flex-preset-body">
        <aside className="flex-preset-sidebar">
          <div className="flex-library-list">
            <button className={selectedFilter === 'All' ? 'flex-library-button is-active' : 'flex-library-button'} onClick={() => setSelectedFilter('All')}>
              <span>All Presets</span>
              <span>{allPresets.length}</span>
            </button>
            {categoryCounts.map(({ category, count }) => (
              <button
                key={category}
                className={selectedFilter === category ? 'flex-library-button is-active' : 'flex-library-button'}
                onClick={() => setSelectedFilter(category)}
              >
                <span>{category}</span>
                <span>{count}</span>
              </button>
            ))}
            <div className="flex-library-divider" />
            <button className={selectedFilter === 'User' ? 'flex-library-button is-active' : 'flex-library-button'} onClick={() => setSelectedFilter('User')}>
              <span>User Presets</span>
              <span>{userPresets.length}</span>
            </button>
          </div>

          <div className="flex-preset-tools">
            <div className="flex-tool-title">Preset Tools</div>
            <button className="soft-button h-9 px-3" onClick={handleSave}>
              Save
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button className="soft-button h-9 px-3" onClick={handleExport}>
                Export
              </button>
              <button className="soft-button h-9 px-3" onClick={handleImport}>
                Import
              </button>
            </div>
            <textarea
              className="mini-input flex-import-textarea"
              value={importText}
              placeholder="Preset JSON"
              onChange={(event) => setImportText(event.target.value)}
            />
          </div>

          <div className="flex-output">
            <div className="flex-output-header">
              <span>Output</span>
              <span className={meter.clipping ? 'is-clipping' : ''}>{meter.clipping ? 'CLIP' : 'OK'}</span>
            </div>
            <MeterLine label="Peak" value={peak} tone={meter.clipping ? 'hot' : 'normal'} />
            <MeterLine label="RMS" value={rms} />
          </div>
        </aside>

        <div className="flex-preset-main">
          <div className="flex-search-row">
            <div className="flex-search-meta">
              <span>{activeFilterLabel}</span>
              <span>{presets.length} sounds</span>
            </div>
            <input className="mini-input" value={query} placeholder="Search presets" onChange={(event) => setQuery(event.target.value)} />
          </div>

          <div className="flex-preset-list">
            {presets.map((preset: SynthPreset) => {
              const userOwned = preset.author === 'User';
              const active = preset.id === currentPreset;
              return (
                <div key={preset.id} className={active ? 'flex-preset-row is-active' : 'flex-preset-row'}>
                  <button className="flex-preset-load" onClick={() => loadPreset(preset)}>
                    <span className="flex-preset-name">{preset.name}</span>
                    <span className="flex-preset-meta">
                      {preset.category} / {preset.author}
                    </span>
                  </button>
                  {active ? <span className="flex-preset-loaded">Loaded</span> : null}
                  {userOwned ? (
                    <button className="flex-delete-button" onClick={() => deleteUserPreset(preset.id)}>
                      Del
                    </button>
                  ) : null}
                </div>
              );
            })}
            {presets.length === 0 ? <div className="flex-empty-state">No presets found.</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
