// Proxy for the Gmail widget. Returns up to 20 recent inbox messages with
// just enough metadata to render a compact preview list. Handles
// transparent access-token refresh using THIS USER's own OAuth app
// credentials loaded from user_oauth_configs.

import { handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { adminClient, getUserId } from '../_shared/auth.ts';
import { getOAuthConfig } from '../_shared/oauthConfigs.ts';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const MAX_MESSAGES = 20;

interface GmailMessageSummary {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
}

interface TokenRow {
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    console.error('refresh failed', res.status, await res.text());
    return null;
  }
  return res.json();
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const userId = await getUserId(req);
  if (!userId) return jsonResponse({ error: 'unauthenticated' }, 401);

  const config = await getOAuthConfig(userId, 'gmail');
  if (!config) {
    return jsonResponse(
      { error: 'oauth-not-configured' },
      400,
    );
  }

  const db = adminClient();
  const { data: row, error: loadError } = await db
    .from('user_integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .maybeSingle<TokenRow>();

  if (loadError) return jsonResponse({ error: loadError.message }, 500);
  if (!row) return jsonResponse({ error: 'not-connected' }, 404);

  let accessToken = row.access_token;
  const expiresAt = row.token_expires_at
    ? new Date(row.token_expires_at).getTime()
    : 0;
  if (expiresAt - 30_000 < Date.now()) {
    if (!row.refresh_token) {
      return jsonResponse(
        {
          error: 'no-refresh-token',
          detail: 'Please disconnect and reconnect Gmail.',
        },
        401,
      );
    }
    const refreshed = await refreshAccessToken(
      row.refresh_token,
      config.clientId,
      config.clientSecret,
    );
    if (!refreshed) {
      return jsonResponse(
        {
          error: 'refresh-failed',
          detail:
            'Refresh token was rejected by Google — you may have revoked access, or it expired. Disconnect and reconnect.',
        },
        401,
      );
    }
    accessToken = refreshed.access_token;
    await db
      .from('user_integrations')
      .update({
        access_token: refreshed.access_token,
        token_expires_at: new Date(
          Date.now() + refreshed.expires_in * 1000,
        ).toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'gmail');
  }

  const listRes = await fetch(
    `${GMAIL_BASE}/messages?maxResults=${MAX_MESSAGES}&labelIds=INBOX`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!listRes.ok) {
    return jsonResponse(
      { error: 'gmail-list-failed', status: listRes.status },
      502,
    );
  }
  const listJson = (await listRes.json()) as {
    messages?: { id: string; threadId: string }[];
  };
  const ids = listJson.messages ?? [];
  if (ids.length === 0) {
    return jsonResponse({ messages: [] as GmailMessageSummary[] });
  }

  const metadataUrl = (id: string) =>
    `${GMAIL_BASE}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`;

  const summaries = await Promise.all(
    ids.map(async ({ id, threadId }) => {
      const metaRes = await fetch(metadataUrl(id), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!metaRes.ok) return null;
      const meta = (await metaRes.json()) as {
        snippet?: string;
        labelIds?: string[];
        payload?: { headers?: { name: string; value: string }[] };
      };
      const headers: Record<string, string> = {};
      for (const h of meta.payload?.headers ?? []) {
        headers[h.name.toLowerCase()] = h.value;
      }
      return {
        id,
        threadId,
        from: headers.from ?? '',
        subject: headers.subject ?? '(no subject)',
        date: headers.date ?? '',
        snippet: meta.snippet ?? '',
        unread: (meta.labelIds ?? []).includes('UNREAD'),
      } satisfies GmailMessageSummary;
    }),
  );

  return jsonResponse({
    messages: summaries.filter((m): m is GmailMessageSummary => m !== null),
  });
});
