// Deployment smoke test. Validates that:
//  1. Edge Functions are reachable from the frontend
//  2. CORS is configured correctly
//  3. The caller's JWT is being forwarded and can be decoded
// The Integrations section in Settings pings this on demand so we can
// confirm the pipeline before wiring up real OAuth providers.

import { corsHeaders, handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { getUserId } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const userId = await getUserId(req);
  if (!userId) {
    return jsonResponse({ error: 'unauthenticated' }, 401);
  }

  return jsonResponse({
    message: 'hello from the integrations backbone',
    userId,
    runtime: 'supabase-edge-function',
    now: new Date().toISOString(),
  });
});

// Silence unused-import warning for corsHeaders when Deno's resolver runs.
void corsHeaders;
