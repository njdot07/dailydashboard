// Tiny auth helpers used by integration Edge Functions. Verifies the
// frontend's JWT and returns a service-role Supabase client for admin-ish
// operations (upserting tokens, reading user_integrations bypassing RLS
// when we need to).
//
// Important: user data operations (e.g. "give me THIS user's Gmail tokens")
// MUST first validate the caller via getUserId() — otherwise the service-role
// client would leak tokens across users.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export function anonClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false } },
  );
}

/**
 * Admin client — bypasses RLS. Use only for operations gated on a prior
 * getUserId() check, so we never read a row for a user other than the
 * authenticated caller.
 */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

/**
 * Extract the Authorization bearer token, ask Supabase to validate it, and
 * return the user id. Returns null if the request is unauthenticated or the
 * token is invalid/expired — callers should respond 401 in that case.
 */
export async function getUserId(req: Request): Promise<string | null> {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const jwt = header.slice(7);

  const client = anonClient();
  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user.id;
}
