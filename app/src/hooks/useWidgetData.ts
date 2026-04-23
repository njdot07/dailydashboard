import { useCallback } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import { useWidgetContext } from '../components/WidgetContext';

/**
 * Read + write this widget instance's data blob, stored on
 * layout.widgetData[widgetId]. Typed generically against whatever shape the
 * calling widget expects; caller supplies the default value so T can be
 * inferred without widget-type juggling.
 *
 * Example:
 *   const [data, setData] = useWidgetData({ notes: [] as PinnedNote[] });
 *
 * Each widget instance (including duplicates of the same type) owns its own
 * slot in widgetData, keyed by the widget's grid id.
 */
export function useWidgetData<T>(defaultValue: T) {
  const { widgetId } = useWidgetContext();
  const stored = useDashboardStore(
    (s) => s.layout.widgetData?.[widgetId],
  ) as T | undefined;
  const setWidgetData = useDashboardStore((s) => s.setWidgetData);

  const value = (stored ?? defaultValue) as T;

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current =
        (useDashboardStore.getState().layout.widgetData?.[widgetId] ??
          defaultValue) as T;
      const resolved =
        typeof next === 'function'
          ? (next as (prev: T) => T)(current)
          : next;
      setWidgetData(widgetId, resolved);
    },
    [widgetId, defaultValue, setWidgetData],
  );

  return [value, setValue] as const;
}
