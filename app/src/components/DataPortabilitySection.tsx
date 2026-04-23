import { useMemo, useState } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import {
  applyImport,
  downloadExport,
  parseImport,
  type ImportMode,
  type ImportResult,
} from '../lib/dataPortability';
import type { WidgetDataShape } from '../lib/types';

export function DataPortabilitySection() {
  const widgetData = useDashboardStore((s) => s.layout.widgetData ?? {});
  const setWidgetData = useDashboardStore((s) => s.setWidgetData);

  const [json, setJson] = useState('');
  const [mode, setMode] = useState<ImportMode>('merge');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ImportResult | null>(null);
  const [imported, setImported] = useState(false);

  const onJsonChange = (value: string) => {
    setJson(value);
    if (imported) setImported(false);
    if (parseError) setParseError(null);
    if (parsed) setParsed(null);
  };

  const parse = () => {
    setParseError(null);
    try {
      const result = parseImport(json);
      const { preview } = result;
      const total =
        preview.pinnedNotes +
        preview.launchpadCategories +
        preview.tasksTotal +
        preview.notesFromThoughts;
      if (total === 0) {
        setParseError(
          'Parsed successfully but nothing to import — the file has no pinned notes, tasks, launchpad categories, or notes.',
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

  const hasAnyData =
    (widgetData['pinned-notes']?.notes.length ?? 0) > 0 ||
    (widgetData.launchpad?.categories.length ?? 0) > 0 ||
    (widgetData['quick-tasks']
      ? Object.keys(widgetData['quick-tasks'].tasks).length > 0
      : false) ||
    (widgetData.notes?.notes.length ?? 0) > 0;

  const preview = parsed?.preview;
  const previewLines = useMemo(() => {
    if (!preview) return [];
    const lines: string[] = [];
    if (preview.pinnedNotes)
      lines.push(
        `${preview.pinnedNotes} pinned note${preview.pinnedNotes === 1 ? '' : 's'}`,
      );
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
        `${preview.notesFromThoughts} note${preview.notesFromThoughts === 1 ? '' : 's'}`,
      );
    return lines;
  }, [preview]);

  const onFilePick = async (file: File) => {
    const text = await file.text();
    onJsonChange(text);
  };

  return (
    <section className="settings-section">
      <h3 className="settings-section-title">Backup & restore</h3>
      <p className="settings-section-hint">
        Download a snapshot of your dashboard as a JSON file, or restore from
        one. Also accepts exports from the original vanilla dashboard if you
        ever need to migrate more data.
      </p>

      {/* ---- Export ---- */}
      <div className="data-port__row">
        <button
          type="button"
          className="primary-btn small-btn"
          onClick={() => downloadExport(widgetData)}
          disabled={!hasAnyData}
          title={hasAnyData ? undefined : 'Nothing to export yet'}
        >
          Download backup
        </button>
        <span className="settings-section-hint">
          Saves a <code>daily-dashboard-backup-*.json</code> file to your
          Downloads folder.
        </span>
      </div>

      {/* ---- Import ---- */}
      <label className="data-port__field">
        <span>Restore from JSON (paste or drop a backup file)</span>
        <textarea
          value={json}
          onChange={(e) => onJsonChange(e.target.value)}
          placeholder={
            '{ "__format": "daily-dashboard/v1", "pinned-notes": { "notes": [...] }, ... }'
          }
          rows={5}
        />
      </label>

      <div className="data-port__row">
        <label className="ghost-btn small-btn data-port__file-label">
          Choose file…
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFilePick(f);
              e.target.value = '';
            }}
            hidden
          />
        </label>
      </div>

      <div className="data-port__mode">
        <label className="data-port__radio">
          <input
            type="radio"
            name="import-mode"
            value="merge"
            checked={mode === 'merge'}
            onChange={() => setMode('merge')}
          />
          <span>
            <strong>Merge</strong> — add imported items alongside your current
            data
          </span>
        </label>
        <label className="data-port__radio">
          <input
            type="radio"
            name="import-mode"
            value="replace"
            checked={mode === 'replace'}
            onChange={() => setMode('replace')}
          />
          <span>
            <strong>Replace</strong> — wipe matching widgets first, then
            import (destructive)
          </span>
        </label>
      </div>

      <div className="data-port__actions">
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
        <div className="data-port__preview">
          <strong>
            Will import ({parsed.preview.format === 'legacy' ? 'legacy' : 'native'} format
            {parsed.preview.exportedAt
              ? `, exported ${new Date(parsed.preview.exportedAt).toLocaleString()}`
              : ''}
            ):
          </strong>
          <ul>
            {previewLines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      {imported && (
        <div className="auth-notice">
          Imported. The widgets on your dashboard should reflect the new
          data; it's also saved to Supabase in the background.
        </div>
      )}
    </section>
  );
}
