import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  LayoutConfig,
  DashboardStateRow,
  WidgetDataMap,
  WidgetInstance,
  QuickTask,
} from '../lib/types';
import { DEFAULT_WIDGETS } from '../lib/defaultLayout';
import { getWidgetEntry } from '../components/widgets/registry';
import { todayKey } from '../lib/date';

const client = supabase as SupabaseClient;

const SAVE_DEBOUNCE_MS = 1000;
const EMPTY_LAYOUT: LayoutConfig = { widgets: [], widgetData: {} };

export type UIMode = 'view' | 'layout' | 'edit';
export const UI_MODES: UIMode[] = ['view', 'layout', 'edit'];

// Keys used by legacy (pre-duplication) schema when widgetData was keyed
// by widget type instead of widget instance id. Used only during the
// one-shot migration in loadDashboard.
const LEGACY_TYPE_KEYS = ['pinned-notes', 'launchpad', 'quick-tasks', 'notes'];

interface GridPosition {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DashboardStore {
  userId: string | null;
  layout: LayoutConfig;
  uiMode: UIMode;
  selectedDate: string;
  loading: boolean;
  saving: boolean;
  error: string | null;

  loadDashboard: (userId: string) => Promise<void>;
  setLayout: (layout: LayoutConfig) => void;
  setWidgetData: (widgetId: string, value: unknown) => void;
  updatePositions: (positions: GridPosition[]) => void;
  addWidget: (type: string) => void;
  removeWidget: (i: string) => void;
  setWidgetSettings: (i: string, settings: Record<string, unknown>) => void;
  setWidgetTitle: (i: string, title: string | null) => void;
  setUIMode: (mode: UIMode) => void;
  setSelectedDate: (date: string) => void;
  reset: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { userId, layout } = useDashboardStore.getState();
    if (!userId) return;
    useDashboardStore.setState({ saving: true });
    const { error } = await client
      .from('dashboard_states')
      .update({ layout_config: layout })
      .eq('user_id', userId);
    useDashboardStore.setState({
      saving: false,
      error: error ? error.message : null,
    });
  }, SAVE_DEBOUNCE_MS);
}

function findNextY(widgets: WidgetInstance[]): number {
  if (widgets.length === 0) return 0;
  return Math.max(...widgets.map((w) => w.y + w.h));
}

function enforceMinSizes(widgets: WidgetInstance[]): {
  widgets: WidgetInstance[];
  changed: boolean;
} {
  let changed = false;
  const result = widgets.map((w) => {
    const entry = getWidgetEntry(w.type);
    if (!entry?.minSize) return w;
    const minW = entry.minSize.w;
    const minH = entry.minSize.h;
    if (w.w < minW || w.h < minH) {
      changed = true;
      return { ...w, w: Math.max(w.w, minW), h: Math.max(w.h, minH) };
    }
    return w;
  });
  return { widgets: result, changed };
}

// One-shot migration of legacy type-keyed widgetData into instance-keyed
// widgetData. For each type key we find the first widget of that type and
// move the data to its instance id. Leftover type keys are dropped.
function migrateTypeKeyedData(
  widgets: WidgetInstance[],
  data: WidgetDataMap,
): { data: WidgetDataMap; changed: boolean } {
  let changed = false;
  const out: WidgetDataMap = { ...data };
  for (const typeKey of LEGACY_TYPE_KEYS) {
    if (!(typeKey in out)) continue;
    const widget = widgets.find((w) => w.type === typeKey);
    if (widget && out[widget.i] === undefined) {
      out[widget.i] = out[typeKey];
    }
    delete out[typeKey];
    changed = true;
  }
  return { data: out, changed };
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  userId: null,
  layout: EMPTY_LAYOUT,
  uiMode: 'view',
  selectedDate: todayKey(),
  loading: false,
  saving: false,
  error: null,

  async loadDashboard(userId) {
    set({ loading: true, error: null, userId });
    const { data, error } = await client
      .from('dashboard_states')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<DashboardStateRow>();

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    if (data) {
      const cfg = data.layout_config ?? EMPTY_LAYOUT;
      const needsSeed = !cfg.widgets || cfg.widgets.length === 0;
      const baseWidgets = needsSeed ? DEFAULT_WIDGETS : cfg.widgets;
      const { widgets: sizedWidgets, changed: sizeChanged } =
        enforceMinSizes(baseWidgets);
      const { data: migratedData, changed: dataChanged } = migrateTypeKeyedData(
        sizedWidgets,
        cfg.widgetData ?? {},
      );
      const hydrated: LayoutConfig = {
        widgets: sizedWidgets,
        widgetData: migratedData,
        gridCols: cfg.gridCols,
      };
      set({ layout: hydrated, loading: false });
      if (needsSeed || sizeChanged || dataChanged) scheduleSave();
      return;
    }

    const seeded: LayoutConfig = { widgets: DEFAULT_WIDGETS, widgetData: {} };
    const { error: insertError } = await client
      .from('dashboard_states')
      .insert({ user_id: userId, layout_config: seeded });

    if (insertError) {
      set({ loading: false, error: insertError.message });
      return;
    }

    set({ layout: seeded, loading: false });
  },

  setLayout(layout) {
    set({ layout });
    scheduleSave();
  },

  setWidgetData(widgetId, value) {
    set((state) => ({
      layout: {
        ...state.layout,
        widgetData: {
          ...(state.layout.widgetData ?? {}),
          [widgetId]: value,
        },
      },
    }));
    scheduleSave();
  },

  updatePositions(positions) {
    set((state) => {
      const byId = new Map(positions.map((p) => [p.i, p]));
      const widgets = state.layout.widgets.map((w) => {
        const p = byId.get(w.i);
        return p ? { ...w, x: p.x, y: p.y, w: p.w, h: p.h } : w;
      });
      return { layout: { ...state.layout, widgets } };
    });
    scheduleSave();
  },

  addWidget(type) {
    const entry = getWidgetEntry(type);
    if (!entry) return;
    set((state) => {
      if (entry.singleton && state.layout.widgets.some((w) => w.type === type)) {
        return state;
      }
      const instance: WidgetInstance = {
        i: `${type}-${crypto.randomUUID().slice(0, 8)}`,
        type,
        x: 0,
        y: findNextY(state.layout.widgets),
        w: entry.defaultSize.w,
        h: entry.defaultSize.h,
      };
      return {
        layout: {
          ...state.layout,
          widgets: [...state.layout.widgets, instance],
        },
      };
    });
    scheduleSave();
  },

  removeWidget(i) {
    set((state) => {
      const nextData = { ...(state.layout.widgetData ?? {}) };
      // Drop any per-instance data belonging to this widget. Shared type
      // data (legacy) stays as-is to avoid accidentally nuking someone
      // else's duplicate during a mid-migration state.
      delete nextData[i];
      return {
        layout: {
          ...state.layout,
          widgets: state.layout.widgets.filter((w) => w.i !== i),
          widgetData: nextData,
        },
      };
    });
    scheduleSave();
  },

  setWidgetSettings(i, settings) {
    set((state) => ({
      layout: {
        ...state.layout,
        widgets: state.layout.widgets.map((w) =>
          w.i === i ? { ...w, settings } : w,
        ),
      },
    }));
    scheduleSave();
  },

  setWidgetTitle(i, title) {
    set((state) => ({
      layout: {
        ...state.layout,
        widgets: state.layout.widgets.map((w) => {
          if (w.i !== i) return w;
          const next = { ...w };
          if (title && title.trim()) {
            next.title = title.trim();
          } else {
            delete next.title;
          }
          return next;
        }),
      },
    }));
    scheduleSave();
  },

  setUIMode(mode) {
    set({ uiMode: mode });
  },

  setSelectedDate(date) {
    set({ selectedDate: date });
  },

  reset() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    set({
      userId: null,
      layout: EMPTY_LAYOUT,
      uiMode: 'view',
      selectedDate: todayKey(),
      loading: false,
      saving: false,
      error: null,
    });
  },
}));

export const selectIsEditMode = (s: DashboardStore) => s.uiMode === 'edit';

// Merge today-grouped tasks across every QuickTasks widget in the layout.
// StatusBar and Calendar use this so a user with multiple task boards sees
// all upcoming items regardless of which board they sit in.
export function selectMergedQuickTasks(
  s: DashboardStore,
): Record<string, QuickTask[]> {
  const result: Record<string, QuickTask[]> = {};
  const data = s.layout.widgetData ?? {};
  for (const widget of s.layout.widgets) {
    if (widget.type !== 'quick-tasks') continue;
    const slice = data[widget.i] as
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
}
