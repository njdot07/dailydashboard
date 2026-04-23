import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  LayoutConfig,
  DashboardStateRow,
  WidgetDataShape,
  WidgetInstance,
} from '../lib/types';
import { DEFAULT_WIDGETS } from '../lib/defaultLayout';
import { getWidgetEntry } from '../components/widgets/registry';
import { todayKey } from '../lib/date';

const client = supabase as SupabaseClient;

const SAVE_DEBOUNCE_MS = 1000;
const EMPTY_LAYOUT: LayoutConfig = { widgets: [], widgetData: {} };

export type UIMode = 'view' | 'layout' | 'edit';
export const UI_MODES: UIMode[] = ['view', 'layout', 'edit'];

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
  // The date currently focused across widgets (QuickTasks list, Calendar
  // selection). In-memory only — always defaults to today on reload.
  selectedDate: string;
  loading: boolean;
  saving: boolean;
  error: string | null;

  loadDashboard: (userId: string) => Promise<void>;
  setLayout: (layout: LayoutConfig) => void;
  setWidgetData: <K extends keyof WidgetDataShape>(
    key: K,
    value: WidgetDataShape[K],
  ) => void;
  updatePositions: (positions: GridPosition[]) => void;
  addWidget: (type: string) => void;
  removeWidget: (i: string) => void;
  setWidgetSettings: (i: string, settings: Record<string, unknown>) => void;
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

// Bumps each widget's w/h up to the registry minimum so legacy layouts
// from before registry sizing (e.g. quote saved at h=1) don't render cut off.
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
      const { widgets: finalWidgets, changed } = enforceMinSizes(baseWidgets);
      const hydrated: LayoutConfig = {
        widgetData: {},
        ...cfg,
        widgets: finalWidgets,
      };
      set({ layout: hydrated, loading: false });
      if (needsSeed || changed) scheduleSave();
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

  setWidgetData(key, value) {
    set((state) => ({
      layout: {
        ...state.layout,
        widgetData: {
          ...(state.layout.widgetData ?? {}),
          [key]: value,
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
    set((state) => ({
      layout: {
        ...state.layout,
        widgets: state.layout.widgets.filter((w) => w.i !== i),
      },
    }));
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

// Convenience selectors
export const selectIsEditMode = (s: DashboardStore) => s.uiMode === 'edit';
