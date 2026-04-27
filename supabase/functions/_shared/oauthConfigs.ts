// Load per-user OAuth app credentials (client_id + client_secret) from the
// user_oauth_configs table. Every Edge Function that talks to a provider's
// OAuth endpoints funnels through this helper so the "bring your own
// credentials" flow stays in one place.

import { adminClient } from './auth.ts';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

export async function getOAuthConfig(
  userId: string,
  provider: string,
): Promise<OAuthConfig | null> {
  const db = adminClient();
  const { data, error } = await db
    .from('user_oauth_configs')
    .select('client_id, client_secret')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();

  if (error) {
    console.error('getOAuthConfig failed', error);
    return null;
  }
  if (!data) return null;
  return {
    clientId: data.client_id as string,
    clientSecret: data.client_secret as string,
  };
}
