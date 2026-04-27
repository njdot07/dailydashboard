import { create } from 'zustand';
import {
  deriveKey,
  encryptString,
  decryptString,
  generateSalt,
  toB64,
  fromB64,
  type Encrypted,
} from '../lib/crypto';

// A known plaintext encrypted during setup. Decrypting it to this exact
// string confirms the passphrase on subsequent unlocks, without ever
// storing the passphrase itself.
const CANARY_PLAINTEXT = 'DAILY_DASHBOARD_CANARY_OK';

export interface Secret {
  id: string;
  name: string;
  iv: string;
  ct: string;
  createdAt: string;
}

export interface Vault {
  salt: string;
  canary: Encrypted;
  items: Secret[];
}

export type VaultStatus = 'uninitialized' | 'locked' | 'unlocked';

interface SecretsStore {
  userId: string | null;
  vault: Vault | null;
  key: CryptoKey | null;
  status: VaultStatus;
  error: string | null;
  working: boolean;

  initialize: (userId: string) => void;
  setup: (passphrase: string) => Promise<boolean>;
  unlock: (passphrase: string) => Promise<boolean>;
  lock: () => void;
  addSecret: (name: string, value: string) => Promise<void>;
  updateSecret: (id: string, name: string, value: string) => Promise<void>;
  removeSecret: (id: string) => void;
  revealSecret: (id: string) => Promise<string | null>;
  destroyVault: () => void;
  reset: () => void;
}

function storageKey(userId: string): string {
  return `secrets_v1_${userId}`;
}

function loadVault(userId: string): Vault | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as Vault;
  } catch {
    return null;
  }
}

function persistVault(userId: string, vault: Vault): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(vault));
}

function resolveStatus(vault: Vault | null, key: CryptoKey | null): VaultStatus {
  if (!vault) return 'uninitialized';
  if (!key) return 'locked';
  return 'unlocked';
}

export const useSecretsStore = create<SecretsStore>((set, get) => ({
  userId: null,
  vault: null,
  key: null,
  status: 'uninitialized',
  error: null,
  working: false,

  initialize(userId) {
    const vault = loadVault(userId);
    set({
      userId,
      vault,
      key: null,
      status: resolveStatus(vault, null),
      error: null,
      working: false,
    });
  },

  async setup(passphrase) {
    const { userId } = get();
    if (!userId) return false;
    set({ working: true, error: null });
    try {
      const saltBytes = generateSalt();
      const key = await deriveKey(passphrase, saltBytes);
      const canary = await encryptString(CANARY_PLAINTEXT, key);
      const vault: Vault = {
        salt: toB64(saltBytes),
        canary,
        items: [],
      };
      persistVault(userId, vault);
      set({
        vault,
        key,
        status: 'unlocked',
        working: false,
      });
      return true;
    } catch (e) {
      set({
        working: false,
        error: (e as Error).message ?? 'Setup failed',
      });
      return false;
    }
  },

  async unlock(passphrase) {
    const { vault } = get();
    if (!vault) return false;
    set({ working: true, error: null });
    try {
      const saltBytes = fromB64(vault.salt);
      const key = await deriveKey(passphrase, saltBytes);
      // Canary check: if the passphrase is wrong, decrypt throws
      // (AES-GCM auth tag mismatch). We catch it and surface a friendly
      // message instead of raw DOMException text.
      let plain: string;
      try {
        plain = await decryptString(vault.canary.iv, vault.canary.ct, key);
      } catch {
        set({ working: false, error: 'Incorrect passphrase' });
        return false;
      }
      if (plain !== CANARY_PLAINTEXT) {
        set({ working: false, error: 'Incorrect passphrase' });
        return false;
      }
      set({ key, status: 'unlocked', working: false });
      return true;
    } catch (e) {
      set({
        working: false,
        error: (e as Error).message ?? 'Failed to unlock',
      });
      return false;
    }
  },

  lock() {
    set((state) => ({
      key: null,
      status: resolveStatus(state.vault, null),
    }));
  },

  async addSecret(name, value) {
    const { key, vault, userId } = get();
    if (!key || !vault || !userId) return;
    const enc = await encryptString(value, key);
    const secret: Secret = {
      id: crypto.randomUUID(),
      name,
      iv: enc.iv,
      ct: enc.ct,
      createdAt: new Date().toISOString(),
    };
    const next: Vault = { ...vault, items: [...vault.items, secret] };
    persistVault(userId, next);
    set({ vault: next });
  },

  async updateSecret(id, name, value) {
    const { key, vault, userId } = get();
    if (!key || !vault || !userId) return;
    const enc = await encryptString(value, key);
    const next: Vault = {
      ...vault,
      items: vault.items.map((s) =>
        s.id === id ? { ...s, name, iv: enc.iv, ct: enc.ct } : s,
      ),
    };
    persistVault(userId, next);
    set({ vault: next });
  },

  removeSecret(id) {
    const { vault, userId } = get();
    if (!vault || !userId) return;
    const next: Vault = {
      ...vault,
      items: vault.items.filter((s) => s.id !== id),
    };
    persistVault(userId, next);
    set({ vault: next });
  },

  async revealSecret(id) {
    const { key, vault } = get();
    if (!key || !vault) return null;
    const secret = vault.items.find((s) => s.id === id);
    if (!secret) return null;
    try {
      return await decryptString(secret.iv, secret.ct, key);
    } catch {
      return null;
    }
  },

  destroyVault() {
    const { userId } = get();
    if (!userId) return;
    localStorage.removeItem(storageKey(userId));
    set({
      vault: null,
      key: null,
      status: 'uninitialized',
      error: null,
    });
  },

  reset() {
    set({
      userId: null,
      vault: null,
      key: null,
      status: 'uninitialized',
      error: null,
      working: false,
    });
  },
}));
