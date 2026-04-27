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

// We don't store client_secret in the store — only the frontend's
// knowledge of "does this user have credentials at all?" (tracked via
// presence of a user_oauth_configs row for this provider). Client id is
// loaded so the setup modal can show the existing value on edit.
export interface OAuthConfigSummary {
  provider: Provider;
  clientId: string;
  hasClientSecret: boolean;
}

interface IntegrationsStore {
  loading: boolean;
  connections: IntegrationConnection[];
  oauthConfigs: OAuthConfigSummary[];
  error: string | null;

  load: (userId: string) => Promise<void>;
  reset: () => void;
  saveOAuthConfig: (
    provider: Provider,
    clientId: string,
    clientSecret: string,
  ) => Promise<boolean>;
  deleteOAuthConfig: (provider: Provider) => Promise<void>;
  startConnect: (provider: Provider) => Promise<void>;
  disconnect: (provider: Provider) => Promise<void>;
}

export const useIntegrationsStore = create<IntegrationsStore>((set, get) => ({
  loading: false,
  connections: [],
  oauthConfigs: [],
  error: null,

  async load(userId) {
    if (!client) return;
    set({ loading: true, error: null });
    const [connectionsRes, configsRes] = await Promise.all([
      client
        .from('user_integrations')
        .select('provider, account_email, token_expires_at, scopes')
        .eq('user_id', userId),
      client
        .from('user_oauth_configs')
        .select('provider, client_id, client_secret')
        .eq('user_id', userId),
    ]);

    if (connectionsRes.error) {
      set({ loading: false, error: connectionsRes.error.message });
      return;
    }
    if (configsRes.error) {
      set({ loading: false, error: configsRes.error.message });
      return;
    }

    set({
      loading: false,
      connections: (connectionsRes.data ?? []).map((row) => ({
        provider: row.provider as Provider,
        accountEmail: row.account_email,
        tokenExpiresAt: row.token_expires_at,
        scopes: row.scopes ?? [],
      })),
      oauthConfigs: (configsRes.data ?? []).map((row) => ({
        provider: row.provider as Provider,
        clientId: row.client_id as string,
        hasClientSecret: Boolean(row.client_secret),
      })),
    });
  },

  reset() {
    set({
      loading: false,
      connections: [],
      oauthConfigs: [],
      error: null,
    });
  },

  async saveOAuthConfig(provider, clientId, clientSecret) {
    if (!client) return false;
    set({ error: null });
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      set({ error: 'Not signed in.' });
      return false;
    }
    const { error } = await client.from('user_oauth_configs').upsert(
      {
        user_id: user.id,
        provider,
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
      },
      { onConflict: 'user_id,provider' },
    );
    if (error) {
      set({ error: error.message });
      return false;
    }
    // Refresh local state so the UI flips to the "configured" state.
    const existing = get().oauthConfigs.filter((c) => c.provider !== provider);
    set({
      oauthConfigs: [
        ...existing,
        { provider, clientId: clientId.trim(), hasClientSecret: true },
      ],
    });
    return true;
  },

  async deleteOAuthConfig(provider) {
    if (!client) return;
    set({ error: null });
    const { error } = await client
      .from('user_oauth_configs')
      .delete()
      .eq('provider', provider);
    if (error) {
      set({ error: error.message });
      return;
    }
    set({
      oauthConfigs: get().oauthConfigs.filter((c) => c.provider !== provider),
    });
  },

  async startConnect(provider) {
    set({ error: null });
    try {
      const { authUrl } = await callEdgeFunction<{ authUrl: string }>(
        `${provider}-oauth-start`,
        { origin: window.location.origin },
      );
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
