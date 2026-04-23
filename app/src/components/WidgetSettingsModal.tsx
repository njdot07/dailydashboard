import { useMemo, useState, useEffect } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import { getWidgetEntry } from './widgets/registry';
import { Modal } from './Modal';
import {
  defaultsFor,
  resolveSetting,
  resolveSettings,
  type SettingField,
  type SettingsSchema,
} from '../lib/widgetSettings';

interface WidgetSettingsModalProps {
  open: boolean;
  widgetId: string;
  onClose: () => void;
}

export function WidgetSettingsModal({
  open,
  widgetId,
  onClose,
}: WidgetSettingsModalProps) {
  const widget = useDashboardStore((s) =>
    s.layout.widgets.find((w) => w.i === widgetId),
  );
  const setWidgetSettings = useDashboardStore((s) => s.setWidgetSettings);
  const setWidgetTitle = useDashboardStore((s) => s.setWidgetTitle);

  const entry = widget ? getWidgetEntry(widget.type) : undefined;
  const schema: SettingsSchema = entry?.settingsSchema ?? {};

  const stored = (widget?.settings ?? {}) as Record<string, unknown>;
  const resolved = useMemo(
    () => resolveSettings(schema, stored),
    [schema, stored],
  );

  // Local draft for the title input so we only persist on blur / save —
  // avoids triggering a save + re-render on every keystroke.
  const [titleDraft, setTitleDraft] = useState(widget?.title ?? '');
  useEffect(() => {
    setTitleDraft(widget?.title ?? '');
  }, [widget?.title, open]);

  if (!widget || !entry) return null;

  const commitTitle = () => {
    const next = titleDraft.trim();
    if ((widget.title ?? '') === next) return;
    setWidgetTitle(widgetId, next || null);
  };

  const update = (key: string, value: unknown) => {
    setWidgetSettings(widgetId, { ...stored, [key]: value });
  };

  const reset = () => {
    setWidgetSettings(widgetId, defaultsFor(schema));
  };

  const hasFields = Object.keys(schema).length > 0;

  return (
    <Modal open={open} onClose={onClose} title={`${entry.title} settings`}>
      <div className="widget-settings-form">
        <label className="ws-field">
          <span className="ws-field__label">Title</span>
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            placeholder={entry.title}
          />
          <small className="ws-field__hint">
            Shown on the widget. Leave blank to use the default
            ("{entry.title}"). Useful when you have more than one
            {entry.singleton === false ? ` ${entry.title.toLowerCase()}` : ''}.
          </small>
        </label>

        {Object.entries(schema).map(([key, field]) => (
          <FieldRow
            key={key}
            field={field}
            value={resolved[key]}
            onChange={(v) => update(key, v)}
          />
        ))}

        <div className="widget-settings-form__actions">
          {hasFields ? (
            <button type="button" className="ghost-btn small-btn" onClick={reset}>
              Reset to defaults
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="primary-btn small-btn"
            onClick={() => {
              commitTitle();
              onClose();
            }}
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: SettingField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const safe = resolveSetting(field, value);

  switch (field.type) {
    case 'number':
      return (
        <label className="ws-field">
          <span className="ws-field__label">{field.label}</span>
          <input
            type="number"
            value={safe as number}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange(Number.isNaN(n) ? field.default : n);
            }}
          />
          {field.hint && <small className="ws-field__hint">{field.hint}</small>}
        </label>
      );

    case 'select':
      return (
        <label className="ws-field">
          <span className="ws-field__label">{field.label}</span>
          <select
            value={safe as string}
            onChange={(e) => onChange(e.target.value)}
          >
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {field.hint && <small className="ws-field__hint">{field.hint}</small>}
        </label>
      );

    case 'text':
      return (
        <label className="ws-field">
          <span className="ws-field__label">{field.label}</span>
          <input
            type="text"
            value={safe as string}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.hint && <small className="ws-field__hint">{field.hint}</small>}
        </label>
      );

    case 'boolean':
      return (
        <label className="ws-field ws-field--toggle">
          <input
            type="checkbox"
            checked={safe as boolean}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="ws-field__label">{field.label}</span>
          {field.hint && <small className="ws-field__hint">{field.hint}</small>}
        </label>
      );
  }
}
