// Web Crypto wrappers for the Secret Manager.
//
// - AES-GCM 256-bit symmetric encryption for each secret and the canary
// - PBKDF2-SHA256 with 200_000 iterations to derive the key from a
//   passphrase (meets OWASP 2023 guidance; ~150ms on modern CPUs)
// - Random 16-byte salt per vault, random 12-byte IV per encryption
//
// All binary values serialise to base64 for localStorage.

const PBKDF2_ITERATIONS = 200_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_ALGO = 'AES-GCM' as const;
const KEY_LENGTH = 256;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    { name: KEY_ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface Encrypted {
  iv: string;
  ct: string;
}

export async function encryptString(
  plaintext: string,
  key: CryptoKey,
): Promise<Encrypted> {
  const iv = generateIV();
  const buffer = await crypto.subtle.encrypt(
    { name: KEY_ALGO, iv: iv as BufferSource },
    key,
    textEncoder.encode(plaintext),
  );
  return { iv: toB64(iv), ct: toB64(new Uint8Array(buffer)) };
}

export async function decryptString(
  iv: string,
  ct: string,
  key: CryptoKey,
): Promise<string> {
  const buffer = await crypto.subtle.decrypt(
    { name: KEY_ALGO, iv: fromB64(iv) as BufferSource },
    key,
    fromB64(ct) as BufferSource,
  );
  return textDecoder.decode(buffer);
}

export function toB64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function fromB64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
