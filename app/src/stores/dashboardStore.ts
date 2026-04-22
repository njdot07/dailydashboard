import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { LayoutConfig, DashboardStateRow } from '../lib/types';

const client = supabase as SupabaseClient;

const SAVE_DEBOUNCE_MS = 1000;
const EMPTY_LAYOUT: LayoutConfig = { widgets: [] };

interface DashboardStore {
  userId: string | null;
  layout: LayoutConfig;
  editMode: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;

  loadDashboard: (userId: string) => Promise<void>;
  setLayout: (layout: LayoutConfig) => void;
  setEditMode: (mode: boolean) => void;
  toggleEditMode: () => void;
  reset: () => void;
}

// Debounce handle lives at module scope — one dashboard is loaded at a time.
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useDashboardStore = create<DashboardStore>((set, get) => ({
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
      set({ layout: data.layout_config ?? EMPTY_LAYOUT, loading: false });
      return;
    }

    // First login: create the row. RLS allows insert where auth.uid() = user_id.
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
    const { userId } = get();
    if (!userId) return;

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      set({ saving: true });
      const { error } = await client
        .from('dashboard_states')
        .update({ layout_config: layout })
        .eq('user_id', userId);
      set({ saving: false, error: error ? error.message : null });
    }, SAVE_DEBOUNCE_MS);
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
