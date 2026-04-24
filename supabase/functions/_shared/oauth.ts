// Minimal HMAC-signed state tokens for OAuth CSRF protection.
//
// On /oauth-start, we sign a payload containing the user id + the origin
// the frontend was on. The user is bounced to Google with state=<this>,
// and Google returns it verbatim to /oauth-callback. Verifying the
// signature there prevents an attacker from invoking the callback with
// a forged code + pretending to be a different user.
//
// Secret used for HMAC is SUPABASE_SERVICE_ROLE_KEY — not ideal (it has
// other privileges) but it's already injected into Edge Functions and
// avoids asking the user to set yet another secret. For a personal
// dashboard the threat model is thin.

const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY missing in function env');
  }
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const pad = (4 - (s.length % 4)) % 4;
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface StatePayload {
  userId: string;
  origin: string;
  provider: string;
  expiresAt: number;
}

export async function signState(
  input: Omit<StatePayload, 'expiresAt'>,
): Promise<string> {
  const payload: StatePayload = {
    ...input,
    expiresAt: Date.now() + STATE_EXPIRY_MS,
  };
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const key = await hmacKey();
  const sig = await crypto.subtle.sign('HMAC', key, data);
  return `${b64url(data)}.${b64url(new Uint8Array(sig))}`;
}

export async function verifyState(
  state: string,
): Promise<StatePayload | null> {
  const parts = state.split('.');
  if (parts.length !== 2) return null;
  try {
    const data = fromB64url(parts[0]);
    const sig = fromB64url(parts[1]);
    const key = await hmacKey();
    const ok = await crypto.subtle.verify('HMAC', key, sig, data);
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(data)) as StatePayload;
    if (typeof payload.expiresAt !== 'number' || Date.now() > payload.expiresAt) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
