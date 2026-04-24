import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Modal } from './Modal';
import {
  useIntegrationsStore,
  type Provider,
} from '../stores/integrationsStore';

// Per-provider metadata: the setup walkthrough, the right names for
// things (Google / Microsoft use different terms), and what the redirect
// URI should be in the provider's console. Keeps the modal generic so
// Outlook + Teams can plug in with a single entry each later.
interface ProviderSetupGuide {
  label: string;
  consoleName: string;
  consoleUrl: string;
  // Steps rendered as a numbered list. Any ReactNode works — for links,
  // code blocks, inline text, etc.
  steps: ReactNode[];
}

function redirectUri(): string {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '') ?? '';
  return `${base}/functions/v1/gmail-oauth-callback`;
}

const GUIDES: Record<Provider, ProviderSetupGuide | null> = {
  gmail: {
    label: 'Gmail',
    consoleName: 'Google Cloud Console',
    consoleUrl: 'https://console.cloud.google.com',
    steps: [
      <>
        Go to{' '}
        <a
          href="https://console.cloud.google.com"
          target="_blank"
          rel="noreferrer noopener"
        >
          console.cloud.google.com
        </a>{' '}
        and sign in with the Google account whose Gmail you want to connect.
      </>,
      <>
        Top-left project picker → <strong>New Project</strong>. Name it
        anything (e.g. <code>My Dashboard</code>). Click{' '}
        <strong>Create</strong>, then switch to the new project.
      </>,
      <>
        Left menu → <strong>APIs &amp; Services</strong> →{' '}
        <strong>OAuth consent screen</strong> → click{' '}
        <strong>Get started</strong>. Fill in: App name (anything), User
        support email (yours), Audience = <strong>External</strong>, then
        continue through to the summary.
      </>,
      <>
        Left menu → <strong>Audience</strong> → under <strong>Test users</strong>{' '}
        click <strong>+ Add Users</strong> → enter your own Gmail →{' '}
        <strong>Save</strong>.
      </>,
      <>
        Left menu → <strong>Library</strong> → search{' '}
        <code>Gmail API</code> → open it → click <strong>Enable</strong>.
      </>,
      <>
        Left menu → <strong>Credentials</strong> (or <strong>Clients</strong>) →{' '}
        <strong>+ Create Credentials</strong> → <strong>OAuth client ID</strong>.
      </>,
      <>
        <strong>Application type</strong>: Web application.{' '}
        <strong>Name</strong>: Daily Dashboard (or anything).
      </>,
      <>
        <strong>Authorized redirect URIs</strong> → <strong>+ Add URI</strong>{' '}
        → paste exactly:
        <div className="oauth-setup__redirect-uri">
          <code>{redirectUri()}</code>
        </div>
        Click <strong>Create</strong>.
      </>,
      <>
        A popup shows your <strong>Client ID</strong> and{' '}
        <strong>Client secret</strong>. Copy both and paste them into the
        form below.
      </>,
    ],
  },
  outlook: null,
  teams: null,
};

interface OAuthSetupModalProps {
  open: boolean;
  provider: Provider;
  onClose: () => void;
}

export function OAuthSetupModal({
  open,
  provider,
  onClose,
}: OAuthSetupModalProps) {
  const existing = useIntegrationsStore((s) =>
    s.oauthConfigs.find((c) => c.provider === provider),
  );
  const saveOAuthConfig = useIntegrationsStore((s) => s.saveOAuthConfig);
  const deleteOAuthConfig = useIntegrationsStore((s) => s.deleteOAuthConfig);

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(!existing);

  // Reset form state whenever the modal opens fresh.
  useEffect(() => {
    if (!open) return;
    setClientId(existing?.clientId ?? '');
    setClientSecret('');
    setError(null);
    setShowInstructions(!existing);
  }, [open, existing]);

  const guide = GUIDES[provider];
  if (!guide) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cid = clientId.trim();
    const cs = clientSecret.trim();
    if (!cid || !cs) {
      setError('Both the Client ID and the Client Secret are required.');
      return;
    }
    setSaving(true);
    setError(null);
    const ok = await saveOAuthConfig(provider, cid, cs);
    setSaving(false);
    if (ok) {
      onClose();
    } else {
      setError('Save failed. Check the network tab or try again.');
    }
  };

  const onDelete = async () => {
    if (
      !confirm(
        'Remove your OAuth credentials? Any active connection will stop refreshing.',
      )
    ) {
      return;
    }
    await deleteOAuthConfig(provider);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`${guide.label} setup`}>
      <div className="oauth-setup">
        <div className="oauth-setup__why">
          <strong>Why this extra step?</strong>
          <p>
            Google's formal verification for Gmail read access requires a
            yearly third-party security audit (US$15k+) and a 6-month
            review — unworkable for a personal tool. Instead, each user
            registers their own Google OAuth app, which makes YOU the
            developer and removes the verification requirement entirely.
            Credentials stay scoped to your own Google Cloud project, you
            remain in full control, and there's no shared server-wide
            secret.
          </p>
        </div>

        <button
          type="button"
          className="oauth-setup__toggle"
          onClick={() => setShowInstructions((v) => !v)}
        >
          {showInstructions ? 'Hide' : 'Show'} step-by-step setup
        </button>

        {showInstructions && (
          <ol className="oauth-setup__steps">
            {guide.steps.map((node, i) => (
              <li key={i}>{node}</li>
            ))}
          </ol>
        )}

        <form className="oauth-setup__form" onSubmit={submit}>
          <h4>Paste your credentials</h4>
          <label>
            <span>Client ID</span>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="1234…abc.apps.googleusercontent.com"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>
          <label>
            <span>Client Secret</span>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={existing ? '••••••••  (hidden — re-enter to update)' : 'GOCSPX-…'}
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>
          {error && <div className="auth-error">{error}</div>}

          <div className="oauth-setup__actions">
            {existing && (
              <button
                type="button"
                className="ghost-btn small-btn"
                onClick={onDelete}
              >
                Remove credentials
              </button>
            )}
            <button
              type="submit"
              className="primary-btn small-btn"
              disabled={saving}
            >
              {saving ? 'Saving…' : existing ? 'Update' : 'Save credentials'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
