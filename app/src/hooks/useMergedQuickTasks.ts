import { useMemo } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import type { QuickTask } from '../lib/types';

/**
 * Returns a merged view of today-grouped tasks across every QuickTasks
 * widget in the layout.
 *
 * Memoised against the store's widgets + widgetData references so it
 * produces a stable result between store updates — a raw store selector
 * that did the merge inline would hand back a new {} on every render,
 * tripping Zustand's equality check and causing an infinite render loop.
 */
export function useMergedQuickTasks(): Record<string, QuickTask[]> {
  const widgets = useDashboardStore((s) => s.layout.widgets);
  const widgetData = useDashboardStore((s) => s.layout.widgetData);

  return useMemo(() => {
    const result: Record<string, QuickTask[]> = {};
    if (!widgetData) return result;
    for (const widget of widgets) {
      if (widget.type !== 'quick-tasks') continue;
      const slice = widgetData[widget.i] as
        | { tasks?: Record<string, QuickTask[]> }
        | undefined;
      const tasks = slice?.tasks;
      if (!tasks) continue;
      for (const [date, arr] of Object.entries(tasks)) {
        if (!Array.isArray(arr)) continue;
        result[date] = [...(result[date] ?? []), ...arr];
      }
    }
    return result;
  }, [widgets, widgetData]);
}
