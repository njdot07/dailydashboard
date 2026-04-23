import { useMemo, useState } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import {
  applyImport,
  parseLegacyExport,
  type LegacyImportResult,
} from '../lib/legacyImport';
import type { WidgetDataShape } from '../lib/types';

type ImportMode = 'merge' | 'replace';

export function LegacyImportSection() {
  const widgetData = useDashboardStore((s) => s.layout.widgetData ?? {});
  const setWidgetData = useDashboardStore((s) => s.setWidgetData);

  const [json, setJson] = useState('');
  const [mode, setMode] = useState<ImportMode>('merge');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<LegacyImportResult | null>(null);
  const [imported, setImported] = useState(false);

  // Reset the success banner any time the user changes the input.
  const onJsonChange = (value: string) => {
    setJson(value);
    if (imported) setImported(false);
    if (parseError) setParseError(null);
    if (parsed) setParsed(null);
  };

  const parse = () => {
    setParseError(null);
    try {
      const result = parseLegacyExport(json);
      const { preview } = result;
      const total =
        preview.pinnedNotes +
        preview.launchpadCategories +
        preview.tasksTotal +
        preview.notesFromThoughts;
      if (total === 0) {
        setParseError(
          'Parsed successfully but nothing to import — the JSON has no pinned notes, tasks, launchpad categories, or thought-space items.',
        );
        setParsed(null);
        return;
      }
      setParsed(result);
    } catch (e) {
      setParseError((e as Error).message);
      setParsed(null);
    }
  };

  const apply = () => {
    if (!parsed) return;
    const merged = applyImport(widgetData, parsed.payload, mode);
    const keys: (keyof WidgetDataShape)[] = [
      'pinned-notes',
      'launchpad',
      'quick-tasks',
      'notes',
    ];
    for (const k of keys) {
      if (merged[k]) setWidgetData(k, merged[k]);
    }
    setImported(true);
    setParsed(null);
    setJson('');
  };

  const preview = parsed?.preview;
  const previewLines = useMemo(() => {
    if (!preview) return [];
    const lines: string[] = [];
    if (preview.pinnedNotes)
      lines.push(`${preview.pinnedNotes} pinned note${preview.pinnedNotes === 1 ? '' : 's'}`);
    if (preview.launchpadCategories)
      lines.push(
        `${preview.launchpadCategories} launchpad ${preview.launchpadCategories === 1 ? 'category' : 'categories'} (${preview.launchpadLinks} links)`,
      );
    if (preview.tasksTotal)
      lines.push(
        `${preview.tasksTotal} task${preview.tasksTotal === 1 ? '' : 's'} across ${preview.taskDates} date${preview.taskDates === 1 ? '' : 's'}`,
      );
    if (preview.notesFromThoughts)
      lines.push(
        `${preview.notesFromThoughts} note${preview.notesFromThoughts === 1 ? '' : 's'} from thought spaces`,
      );
    return lines;
  }, [preview]);

  return (
    <section className="settings-section">
      <h3 className="settings-section-title">Import legacy data</h3>
      <p className="settings-section-hint">
        Have data from the old <code>index.html</code> dashboard? Export it
        using <code>legacy-export.html</code> in the repo root (serve it from
        the old <code>server.ps1</code> on port 8080), then paste the JSON below.
      </p>

      <label className="legacy-import__field">
        <span>Pasted JSON</span>
        <textarea
          value={json}
          onChange={(e) => onJsonChange(e.target.value)}
          placeholder={'{ "pinnedNotes": [...], "settings": {...}, "2026-04-22": {...}, ... }'}
          rows={6}
        />
      </label>

      <div className="legacy-import__mode">
        <label className="legacy-import__radio">
          <input
            type="radio"
            name="import-mode"
            value="merge"
            checked={mode === 'merge'}
            onChange={() => setMode('merge')}
          />
          <span>
            <strong>Merge</strong> — add imported items to your current data
          </span>
        </label>
        <label className="legacy-import__radio">
          <input
            type="radio"
            name="import-mode"
            value="replace"
            checked={mode === 'replace'}
            onChange={() => setMode('replace')}
          />
          <span>
            <strong>Replace</strong> — clear matching widgets first, then
            import (destructive)
          </span>
        </label>
      </div>

      <div className="legacy-import__actions">
        <button
          type="button"
          className="ghost-btn small-btn"
          onClick={parse}
          disabled={!json.trim()}
        >
          Parse & preview
        </button>
        {parsed && (
          <button
            type="button"
            className="primary-btn small-btn"
            onClick={apply}
          >
            {mode === 'merge' ? 'Import' : 'Replace & import'}
          </button>
        )}
      </div>

      {parseError && <div className="auth-error">{parseError}</div>}

      {parsed && (
        <div className="legacy-import__preview">
          <strong>Will import:</strong>
          <ul>
            {previewLines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      {imported && (
        <div className="auth-notice">
          Imported. Your widgets should show the new data now — the import
          also saved to Supabase in the background.
        </div>
      )}
    </section>
  );
}
