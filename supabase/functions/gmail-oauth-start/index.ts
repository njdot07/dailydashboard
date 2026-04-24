// Step 1 of the OAuth dance. Frontend calls this with the current window
// origin, we verify the caller's JWT, then return the Google authorization
// URL the frontend should redirect the user's browser to.

import { handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { getUserId } from '../_shared/auth.ts';
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

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const redirectBase = Deno.env.get('OAUTH_REDIRECT_BASE');
  if (!clientId || !redirectBase) {
    return jsonResponse(
      {
        error:
          'server not configured — set GOOGLE_CLIENT_ID and OAUTH_REDIRECT_BASE',
      },
      500,
    );
  }

  const state = await signState({ userId, origin, provider: 'gmail' });

  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set(
    'redirect_uri',
    `${redirectBase}/gmail-oauth-callback`,
  );
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GMAIL_SCOPE);
  // offline + prompt=consent together are what make Google hand back a
  // refresh token we can use later to keep calling the API past the
  // 1-hour access-token lifetime.
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);

  return jsonResponse({ authUrl: url.toString() });
});
