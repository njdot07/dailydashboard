// Step 1 of the OAuth dance. Frontend calls this with the current window
// origin, we verify the caller's JWT and look up THEIR OAuth app
// credentials (from user_oauth_configs — each user registers their own
// Google Cloud project), then return the Google authorization URL the
// frontend should redirect the user's browser to.

import { handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { getUserId } from '../_shared/auth.ts';
import { getOAuthConfig } from '../_shared/oauthConfigs.ts';
import { signState } from '../_shared/oauth.ts';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const userId = await getUserId(req);
  if (!userId) return jsonResponse({ error: 'unauthenticated' }, 401);

  const body = await req.json().catch(() => ({}));
  const origin =
    typeof body?.origin === 'string' ? body.origin : 'http://localhost:5173';

  const config = await getOAuthConfig(userId, 'gmail');
  if (!config) {
    return jsonResponse(
      {
        error: 'oauth-not-configured',
        detail:
          'Set up your Google OAuth app credentials in Settings → Integrations → Gmail → Set up first.',
      },
      400,
    );
  }

  const redirectBase = Deno.env.get('OAUTH_REDIRECT_BASE');
  if (!redirectBase) {
    return jsonResponse(
      { error: 'server-misconfigured', detail: 'OAUTH_REDIRECT_BASE missing.' },
      500,
    );
  }

  const state = await signState({ userId, origin, provider: 'gmail' });

  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', `${redirectBase}/gmail-oauth-callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GMAIL_SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);

  return jsonResponse({ authUrl: url.toString() });
});
