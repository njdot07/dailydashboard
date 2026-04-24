// Step 2 of the OAuth dance. Google redirects here after the user grants
// consent. We exchange the auth code for access + refresh tokens, fetch
// the user's email address to store alongside the tokens, then bounce
// the browser back to the frontend's origin.

import { handlePreflight } from '../_shared/cors.ts';
import { adminClient } from '../_shared/auth.ts';
import { verifyState } from '../_shared/oauth.ts';

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
  // When state is invalid we don't know where to send the user, so we just
  // render a plain HTML error. Rare path — only hit on a tampered state.
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

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const redirectBase = Deno.env.get('OAUTH_REDIRECT_BASE');
  if (!clientId || !clientSecret || !redirectBase) {
    return redirectToFrontend(payload.origin, 'error', 'server-misconfigured');
  }

  // Exchange the auth code for tokens.
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
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

  // Fetch the user's email so we can show "connected as x@y.com".
  const profileRes = await fetch(PROFILE_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  let accountEmail: string | null = null;
  if (profileRes.ok) {
    const profile = (await profileRes.json()) as { emailAddress?: string };
    accountEmail = profile.emailAddress ?? null;
  }

  // Persist. Upsert on (user_id, provider) so reconnecting overwrites the
  // old tokens rather than erroring on the unique constraint.
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
