import { useEffect, useState } from 'react';
import { useSecretsStore } from '../stores/secretsStore';
import { decryptString } from '../lib/crypto';

/**
 * Returns the plaintext value of a named secret, or null if the vault is
 * locked, the named secret doesn't exist, or decryption fails.
 *
 * The plaintext lives only in this component's state and the decryption
 * key lives only in the store's in-memory state. Both are cleared when
 * the vault is locked or the user signs out.
 */
export function useSecret(name: string): string | null {
  const vault = useSecretsStore((s) => s.vault);
  const key = useSecretsStore((s) => s.key);
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    if (!vault || !key) {
      setValue(null);
      return;
    }
    const secret = vault.items.find((s) => s.name === name);
    if (!secret) {
      setValue(null);
      return;
    }

    let cancelled = false;
    decryptString(secret.iv, secret.ct, key)
      .then((v) => {
        if (!cancelled) setValue(v);
      })
      .catch(() => {
        if (!cancelled) setValue(null);
      });
    return () => {
      cancelled = true;
    };
  }, [vault, key, name]);

  return value;
}
