import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { callEdgeFunction } from '../lib/edgeFunctions';

const client = supabase as SupabaseClient | null;

export type Provider = 'gmail' | 'outlook' | 'teams';

// Only non-sensitive columns — tokens never leave the Edge Functions.
export interface IntegrationConnection {
  provider: Provider;
  accountEmail: string | null;
  tokenExpiresAt: string | null;
  scopes: string[];
}

interface IntegrationsStore {
  loading: boolean;
  connections: IntegrationConnection[];
  error: string | null;

  load: (userId: string) => Promise<void>;
  reset: () => void;
  startConnect: (provider: Provider) => Promise<void>;
  disconnect: (provider: Provider) => Promise<void>;
}

export const useIntegrationsStore = create<IntegrationsStore>((set, get) => ({
  loading: false,
  connections: [],
  error: null,

  async load(userId) {
    if (!client) return;
    set({ loading: true, error: null });
    const { data, error } = await client
      .from('user_integrations')
      .select('provider, account_email, token_expires_at, scopes')
      .eq('user_id', userId);
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    set({
      loading: false,
      connections: (data ?? []).map((row) => ({
        provider: row.provider as Provider,
        accountEmail: row.account_email,
        tokenExpiresAt: row.token_expires_at,
        scopes: row.scopes ?? [],
      })),
    });
  },

  reset() {
    set({ loading: false, connections: [], error: null });
  },

  async startConnect(provider) {
    set({ error: null });
    try {
      const { authUrl } = await callEdgeFunction<{ authUrl: string }>(
        `${provider}-oauth-start`,
        { origin: window.location.origin },
      );
      // Full navigation — the OAuth callback brings us back.
      window.location.href = authUrl;
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  async disconnect(provider) {
    if (!client) return;
    set({ error: null });
    const { error } = await client
      .from('user_integrations')
      .delete()
      .eq('provider', provider);
    if (error) {
      set({ error: error.message });
      return;
    }
    set({
      connections: get().connections.filter((c) => c.provider !== provider),
    });
  },
}));
