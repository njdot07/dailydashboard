import { useCallback, useMemo } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import { getWidgetEntry } from '../components/widgets/registry';
import {
  resolveSettings,
  type SettingsSchema,
} from '../lib/widgetSettings';
import { useWidgetContext } from '../components/WidgetContext';

interface UseWidgetSettingsResult {
  settings: Record<string, unknown>;
  schema: SettingsSchema;
  updateSetting: (key: string, value: unknown) => void;
  setAll: (next: Record<string, unknown>) => void;
}

/**
 * Read + write this widget's settings blob (stored on layout.widgets[i].settings).
 *
 * - settings: fully-resolved values (with defaults applied + invalid values
 *   snapped back to defaults) — widgets can consume these directly.
 * - schema: the widget's declared schema, empty {} if the widget didn't
 *   declare one.
 * - updateSetting: patch one field; triggers a debounced save.
 * - setAll: replace the whole blob (used by the settings modal's Reset).
 *
 * Pulls widgetId from WidgetContext so callers don't have to thread it.
 */
export function useWidgetSettings(): UseWidgetSettingsResult {
  const { widgetId } = useWidgetContext();
  const widget = useDashboardStore((s) =>
    s.layout.widgets.find((w) => w.i === widgetId),
  );
  const setWidgetSettings = useDashboardStore((s) => s.setWidgetSettings);

  const entry = widget ? getWidgetEntry(widget.type) : undefined;
  const schema: SettingsSchema = entry?.settingsSchema ?? {};
  const stored = (widget?.settings ?? undefined) as
    | Record<string, unknown>
    | undefined;

  const settings = useMemo(
    () => resolveSettings(schema, stored),
    [schema, stored],
  );

  const updateSetting = useCallback(
    (key: string, value: unknown) => {
      const base = (widget?.settings ?? {}) as Record<string, unknown>;
      setWidgetSettings(widgetId, { ...base, [key]: value });
    },
    [widgetId, widget?.settings, setWidgetSettings],
  );

  const setAll = useCallback(
    (next: Record<string, unknown>) => {
      setWidgetSettings(widgetId, next);
    },
    [widgetId, setWidgetSettings],
  );

  return { settings, schema, updateSetting, setAll };
}
