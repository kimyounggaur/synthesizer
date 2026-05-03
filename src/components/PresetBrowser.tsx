import { useEffect, useMemo, useState } from 'react';
import { factoryPresets, presetCategoryOrder } from '../presets/factoryPresets';
import { usePresetStore } from '../store/presetStore';
import { selectEngineState, useSynthStore } from '../store/synthStore';
import type { SynthPreset } from '../types/synth';
import { createUserPreset, exportPresets, parsePresetImport } from '../utils/presetStorage';

export function PresetBrowser() {
  const [query, setQuery] = useState('');
  const [importText, setImportText] = useState('');
  const loadPreset = useSynthStore((state) => state.loadPreset);
  const savePresetMarker = useSynthStore((state) => state.savePreset);
  const userPresets = usePresetStore((state) => state.userPresets);
  const loadUserPresets = usePresetStore((state) => state.loadUserPresets);
  const saveUserPreset = usePresetStore((state) => state.saveUserPreset);
  const deleteUserPreset = usePresetStore((state) => state.deleteUserPreset);
  const importUserPresets = usePresetStore((state) => state.importUserPresets);

  useEffect(() => {
    loadUserPresets();
  }, [loadUserPresets]);

  const presets = useMemo(() => {
    const all = [...factoryPresets, ...userPresets];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return all;
    }
    return all.filter((preset) => `${preset.name} ${preset.category}`.toLowerCase().includes(normalizedQuery));
  }, [query, userPresets]);

  const groupedPresets = useMemo(() => {
    const categoryGroups = presetCategoryOrder
      .map((category) => ({
        category,
        presets: presets.filter((preset) => preset.category === category),
      }))
      .filter((group) => group.presets.length > 0);

    const customCategories = Array.from(new Set(presets.map((preset) => preset.category))).filter((category) => !presetCategoryOrder.includes(category));
    const customGroups = customCategories.map((category) => ({
      category,
      presets: presets.filter((preset) => preset.category === category),
    }));

    return [...categoryGroups, ...customGroups];
  }, [presets]);

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
    await navigator.clipboard.writeText(exportPresets(userPresets));
  };

  const handleImport = () => {
    try {
      importUserPresets(parsePresetImport(importText));
      setImportText('');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Preset import failed.');
    }
  };

  return (
    <section className="panel grid gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="panel-title">Presets</h2>
        <button className="soft-button h-9 px-3" onClick={handleSave}>
          Save
        </button>
      </div>

      <input className="mini-input" value={query} placeholder="Search" onChange={(event) => setQuery(event.target.value)} />

      <div className="preset-list max-h-80 overflow-y-auto pr-1">
        {groupedPresets.map((group) => (
          <div key={group.category} className="preset-group">
            <div className="preset-group-header">
              <span>{group.category}</span>
              <span>{group.presets.length}</span>
            </div>
            <div className="grid gap-2">
              {group.presets.map((preset: SynthPreset) => {
                const userOwned = preset.author === 'User';
                return (
                  <div key={preset.id} className="preset-row">
                    <button className="min-w-0 text-left" onClick={() => loadPreset(preset)}>
                      <div className="truncate text-sm font-semibold text-slate-100">{preset.name}</div>
                      <div className="font-mono text-[0.68rem] uppercase text-slate-500">{preset.author}</div>
                    </button>
                    {userOwned ? (
                      <button className="soft-button h-8 px-2 text-xs" onClick={() => deleteUserPreset(preset.id)}>
                        Del
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {groupedPresets.length === 0 ? <div className="rounded-md border border-slate-700/70 bg-black/20 p-3 text-sm text-slate-400">No presets found.</div> : null}
      </div>

      <div className="grid gap-2 border-t border-slate-700/60 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <button className="soft-button h-9 px-3" onClick={handleExport}>
            Export
          </button>
          <button className="soft-button h-9 px-3" onClick={handleImport}>
            Import
          </button>
        </div>
        <textarea
          className="mini-input min-h-20 resize-y font-mono text-xs"
          value={importText}
          placeholder="JSON"
          onChange={(event) => setImportText(event.target.value)}
        />
      </div>
    </section>
  );
}
