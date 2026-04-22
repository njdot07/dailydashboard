import { useMemo } from 'react';
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

  const entry = widget ? getWidgetEntry(widget.type) : undefined;
  const schema: SettingsSchema | undefined = entry?.settingsSchema;

  const stored = (widget?.settings ?? {}) as Record<string, unknown>;
  const resolved = useMemo(
    () => (schema ? resolveSettings(schema, stored) : {}),
    [schema, stored],
  );

  if (!widget || !entry || !schema || Object.keys(schema).length === 0) {
    return null;
  }

  const update = (key: string, value: unknown) => {
    setWidgetSettings(widgetId, { ...stored, [key]: value });
  };

  const reset = () => {
    setWidgetSettings(widgetId, defaultsFor(schema));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${entry.title} settings`}
    >
      <div className="widget-settings-form">
        {Object.entries(schema).map(([key, field]) => (
          <FieldRow
            key={key}
            field={field}
            value={resolved[key]}
            onChange={(v) => update(key, v)}
          />
        ))}

        <div className="widget-settings-form__actions">
          <button type="button" className="ghost-btn small-btn" onClick={reset}>
            Reset to defaults
          </button>
          <button
            type="button"
            className="primary-btn small-btn"
            onClick={onClose}
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
  // Narrow `value` through the same resolver the form uses so we never
  // feed a bogus cached value into an input and trigger a controlled/
  // uncontrolled warning.
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
