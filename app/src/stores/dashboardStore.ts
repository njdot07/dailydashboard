import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { LayoutConfig, DashboardStateRow, WidgetDataShape } from '../lib/types';

const client = supabase as SupabaseClient;

const SAVE_DEBOUNCE_MS = 1000;
const EMPTY_LAYOUT: LayoutConfig = { widgets: [], widgetData: {} };

interface DashboardStore {
  userId: string | null;
  layout: LayoutConfig;
  editMode: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;

  loadDashboard: (userId: string) => Promise<void>;
  setLayout: (layout: LayoutConfig) => void;
  setWidgetData: <K extends keyof WidgetDataShape>(
    key: K,
    value: WidgetDataShape[K],
  ) => void;
  setEditMode: (mode: boolean) => void;
  toggleEditMode: () => void;
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

export const useDashboardStore = create<DashboardStore>((set) => ({
  userId: null,
  layout: EMPTY_LAYOUT,
  editMode: false,
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
      set({
        layout: { widgetData: {}, ...cfg },
        loading: false,
      });
      return;
    }

    const { error: insertError } = await client
      .from('dashboard_states')
      .insert({ user_id: userId, layout_config: EMPTY_LAYOUT });

    if (insertError) {
      set({ loading: false, error: insertError.message });
      return;
    }

    set({ layout: EMPTY_LAYOUT, loading: false });
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

  setEditMode(mode) {
    set({ editMode: mode });
  },

  toggleEditMode() {
    set((state) => ({ editMode: !state.editMode }));
  },

  reset() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    set({
      userId: null,
      layout: EMPTY_LAYOUT,
      editMode: false,
      loading: false,
      saving: false,
      error: null,
    });
  },
}));
