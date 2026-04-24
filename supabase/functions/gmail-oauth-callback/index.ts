// Step 2 of the OAuth dance. Google redirects here after the user grants
// consent. We verify the signed state, load THE USER's OAuth credentials
// (not a shared server-wide pair — each user brings their own), exchange
// the auth code for tokens, fetch their Gmail address, then bounce the
// browser back to the frontend.

import { handlePreflight } from '../_shared/cors.ts';
import { adminClient } from '../_shared/auth.ts';
import { verifyState } from '../_shared/oauth.ts';
import { getOAuthConfig } from '../_shared/oauthConfigs.ts';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const PROFILE_ENDPOINT =
  'https://gmail.googleapis.com/gmail/v1/users/me/profile';

function redirectToFrontend(origin: string, status: string, detail?: string) {
  const url = new URL('/', origin);
  url.searchParams.set('integration', 'gmail');
  url.searchParams.set('status', status);
  if (detail) url.searchParams.set('detail', detail);
  return Response.redirect(url.toString(), 302);
}

function errorPage(message: string): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>OAuth error</title>
     <body style="font-family:system-ui;padding:2rem"><h1>OAuth error</h1><p>${message}</p>
     <p>Close this tab and try again.</p>`,
    { status: 400, headers: { 'Content-Type': 'text/html' } },
  );
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (!stateParam) return errorPage('missing state parameter');
  const payload = await verifyState(stateParam);
  if (!payload) return errorPage('invalid or expired state');
  if (payload.provider !== 'gmail') return errorPage('wrong provider in state');

  if (oauthError) {
    return redirectToFrontend(payload.origin, 'denied', oauthError);
  }
  if (!code) {
    return redirectToFrontend(payload.origin, 'error', 'missing-code');
  }

  // Load this user's own OAuth credentials (they saved them via the
  // setup modal after registering their own Google Cloud project).
  const config = await getOAuthConfig(payload.userId, 'gmail');
  if (!config) {
    return redirectToFrontend(payload.origin, 'error', 'no-oauth-config');
  }

  const redirectBase = Deno.env.get('OAUTH_REDIRECT_BASE');
  if (!redirectBase) {
    return redirectToFrontend(payload.origin, 'error', 'server-misconfigured');
  }

  // Exchange the auth code for tokens using the user's own credentials.
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: `${redirectBase}/gmail-oauth-callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    console.error('token exchange failed', detail);
    return redirectToFrontend(payload.origin, 'error', 'token-exchange');
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  const profileRes = await fetch(PROFILE_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  let accountEmail: string | null = null;
  if (profileRes.ok) {
    const profile = (await profileRes.json()) as { emailAddress?: string };
    accountEmail = profile.emailAddress ?? null;
  }

  const db = adminClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error: upsertError } = await db.from('user_integrations').upsert(
    {
      user_id: payload.userId,
      provider: 'gmail',
      account_email: accountEmail,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      scopes: (tokens.scope ?? '').split(' ').filter(Boolean),
    },
    { onConflict: 'user_id,provider' },
  );

  if (upsertError) {
    console.error('upsert failed', upsertError);
    return redirectToFrontend(payload.origin, 'error', 'db-upsert');
  }

  return redirectToFrontend(payload.origin, 'success');
});
