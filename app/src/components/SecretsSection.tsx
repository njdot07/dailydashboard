import { useState, type FormEvent } from 'react';
import { useSecretsStore, type Secret } from '../stores/secretsStore';

const MIN_PASSPHRASE = 8;

export function SecretsSection() {
  const status = useSecretsStore((s) => s.status);
  const error = useSecretsStore((s) => s.error);

  return (
    <section className="settings-section secrets-section">
      <h3 className="settings-section-title">Secret Manager</h3>
      <p className="settings-section-hint">
        API keys and other secrets, encrypted in this browser with a master
        passphrase. Never synced to Supabase or any server. You'll be asked
        to unlock once per session.
      </p>

      {status === 'uninitialized' && <SecretsSetup />}
      {status === 'locked' && <SecretsUnlock />}
      {status === 'unlocked' && <SecretsList />}

      {error && <div className="auth-error">{error}</div>}
    </section>
  );
}

function SecretsSetup() {
  const setup = useSecretsStore((s) => s.setup);
  const working = useSecretsStore((s) => s.working);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (pw.length < MIN_PASSPHRASE) {
      setLocalError(`Passphrase must be at least ${MIN_PASSPHRASE} characters.`);
      return;
    }
    if (pw !== confirm) {
      setLocalError('Passphrases do not match.');
      return;
    }
    const ok = await setup(pw);
    if (ok) {
      setPw('');
      setConfirm('');
    }
  };

  return (
    <form className="secrets-form" onSubmit={submit}>
      <p className="secrets-form__intro">
        Choose a master passphrase. <strong>We can't recover this.</strong> If
        you lose it, your saved secrets are unrecoverable.
      </p>
      <label>
        <span>New passphrase</span>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          minLength={MIN_PASSPHRASE}
          autoComplete="new-password"
          required
        />
      </label>
      <label>
        <span>Confirm passphrase</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={MIN_PASSPHRASE}
          autoComplete="new-password"
          required
        />
      </label>
      {localError && <div className="auth-error">{localError}</div>}
      <button type="submit" className="primary-btn" disabled={working}>
        {working ? 'Setting up…' : 'Set master passphrase'}
      </button>
    </form>
  );
}

function SecretsUnlock() {
  const unlock = useSecretsStore((s) => s.unlock);
  const destroyVault = useSecretsStore((s) => s.destroyVault);
  const working = useSecretsStore((s) => s.working);
  const [pw, setPw] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await unlock(pw);
    if (ok) setPw('');
  };

  const onDestroy = () => {
    if (
      confirm(
        'This erases your encrypted secrets on this device. You will need to re-add them. Continue?',
      )
    ) {
      destroyVault();
    }
  };

  return (
    <form className="secrets-form" onSubmit={submit}>
      <p className="secrets-form__intro">
        Secrets are locked. Enter your master passphrase to unlock for this
        session.
      </p>
      <label>
        <span>Master passphrase</span>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
          autoFocus
          required
        />
      </label>
      <div className="secrets-form__actions">
        <button type="submit" className="primary-btn" disabled={working}>
          {working ? 'Unlocking…' : 'Unlock'}
        </button>
        <button type="button" className="ghost-btn" onClick={onDestroy}>
          Forgot? Start over
        </button>
      </div>
    </form>
  );
}

function SecretsList() {
  const vault = useSecretsStore((s) => s.vault);
  const lock = useSecretsStore((s) => s.lock);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const items = vault?.items ?? [];

  return (
    <div className="secrets-list">
      <div className="secrets-list__toolbar">
        <span className="secrets-list__count">
          {items.length} {items.length === 1 ? 'secret' : 'secrets'}
        </span>
        <div className="secrets-list__actions">
          {!adding && !editingId && (
            <button
              type="button"
              className="primary-btn small-btn"
              onClick={() => setAdding(true)}
            >
              + Add secret
            </button>
          )}
          <button type="button" className="ghost-btn small-btn" onClick={lock}>
            Lock
          </button>
        </div>
      </div>

      {adding && <SecretEditor mode="new" onDone={() => setAdding(false)} />}

      {items.length === 0 && !adding && (
        <p className="widget-empty">No secrets yet.</p>
      )}

      <ul className="secrets-items">
        {items.map((s) =>
          editingId === s.id ? (
            <li key={s.id}>
              <SecretEditor
                mode="edit"
                secret={s}
                onDone={() => setEditingId(null)}
              />
            </li>
          ) : (
            <SecretRow
              key={s.id}
              secret={s}
              onEdit={() => setEditingId(s.id)}
            />
          ),
        )}
      </ul>
    </div>
  );
}

function SecretRow({ secret, onEdit }: { secret: Secret; onEdit: () => void }) {
  const revealSecret = useSecretsStore((s) => s.revealSecret);
  const removeSecret = useSecretsStore((s) => s.removeSecret);
  const [revealed, setRevealed] = useState<string | null>(null);

  const toggle = async () => {
    if (revealed) {
      setRevealed(null);
      return;
    }
    const value = await revealSecret(secret.id);
    setRevealed(value ?? '(could not decrypt)');
  };

  const onDelete = () => {
    if (confirm(`Delete secret "${secret.name}"?`)) {
      removeSecret(secret.id);
    }
  };

  return (
    <li className="secret-row">
      <div className="secret-row__main">
        <span className="secret-row__name">{secret.name}</span>
        <span className="secret-row__value" title={revealed ?? 'hidden'}>
          {revealed ?? '••••••••••••'}
        </span>
      </div>
      <div className="secret-row__actions">
        <button
          type="button"
          className="ghost-btn small-btn"
          onClick={toggle}
        >
          {revealed ? 'Hide' : 'Show'}
        </button>
        <button
          type="button"
          className="item-icon-btn"
          onClick={onEdit}
          aria-label="Edit secret"
          title="Edit"
        >
          ✎
        </button>
        <button
          type="button"
          className="item-icon-btn item-icon-btn--delete"
          onClick={onDelete}
          aria-label="Delete secret"
          title="Delete"
        >
          ×
        </button>
      </div>
    </li>
  );
}

function SecretEditor({
  mode,
  secret,
  onDone,
}: {
  mode: 'new' | 'edit';
  secret?: Secret;
  onDone: () => void;
}) {
  const addSecret = useSecretsStore((s) => s.addSecret);
  const updateSecret = useSecretsStore((s) => s.updateSecret);
  const revealSecret = useSecretsStore((s) => s.revealSecret);

  const [name, setName] = useState(secret?.name ?? '');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(mode === 'new');

  // On edit, seed the input with the current plaintext so the user can
  // make small tweaks without retyping the whole key.
  if (mode === 'edit' && !hydrated && secret) {
    setHydrated(true);
    void revealSecret(secret.id).then((v) => {
      if (v) setValue(v);
    });
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !value) return;
    setLoading(true);
    if (mode === 'new') {
      await addSecret(trimmed, value);
    } else if (secret) {
      await updateSecret(secret.id, trimmed, value);
    }
    setLoading(false);
    onDone();
  };

  return (
    <form className="secret-editor" onSubmit={submit}>
      <div className="secret-editor__row">
        <label className="secret-editor__name">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. comfyui_api_key"
            required
            autoFocus
          />
        </label>
        <label className="secret-editor__value">
          <span>Value</span>
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="sk-... or similar"
            required
          />
        </label>
      </div>
      <div className="secret-editor__actions">
        <button type="button" className="ghost-btn small-btn" onClick={onDone}>
          Cancel
        </button>
        <button
          type="submit"
          className="primary-btn small-btn"
          disabled={loading || !name.trim() || !value}
        >
          {loading ? 'Saving…' : mode === 'new' ? 'Save secret' : 'Update'}
        </button>
      </div>
    </form>
  );
}
