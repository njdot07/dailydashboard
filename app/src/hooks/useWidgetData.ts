import { useCallback } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import type { WidgetDataShape } from '../lib/types';

type NonNull<T> = Exclude<T, undefined>;

export function useWidgetData<K extends keyof WidgetDataShape>(
  key: K,
  defaultValue: NonNull<WidgetDataShape[K]>,
) {
  const data = useDashboardStore((s) => s.layout.widgetData?.[key]);
  const setWidgetData = useDashboardStore((s) => s.setWidgetData);
  const value = (data ?? defaultValue) as NonNull<WidgetDataShape[K]>;

  const setValue = useCallback(
    (next: NonNull<WidgetDataShape[K]> | ((prev: NonNull<WidgetDataShape[K]>) => NonNull<WidgetDataShape[K]>)) => {
      const current =
        (useDashboardStore.getState().layout.widgetData?.[key] ??
          defaultValue) as NonNull<WidgetDataShape[K]>;
      const resolved =
        typeof next === 'function'
          ? (next as (prev: NonNull<WidgetDataShape[K]>) => NonNull<WidgetDataShape[K]>)(current)
          : next;
      setWidgetData(key, resolved as WidgetDataShape[K]);
    },
    [key, defaultValue, setWidgetData],
  );

  return [value, setValue] as const;
}
