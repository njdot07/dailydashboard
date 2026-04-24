import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Modal } from './Modal';
import { useUser } from '../providers/UserProvider';
import {
  useIntegrationsStore,
  type Provider,
} from '../stores/integrationsStore';

// -----------------------------------------------------------------------
// Configurable constants — edit here if the contact email or fee changes.
// -----------------------------------------------------------------------
const SUPPORT_EMAIL = 'dailydashboard@gmail.com';
const PAID_SETUP_FEE_USD = 39;
// "Administrator" is the formal term the product uses for the person who
// runs this dashboard instance. Change here if you prefer "Creator",
// "Operator", etc. — it's surfaced verbatim in modal copy.
const ADMIN_NOUN = 'Dashboard Administrator';

// Per-provider metadata + walkthrough. Keeps the modal generic so Outlook
// + Teams can be added as map entries later.
interface ProviderSetupGuide {
  label: string;
  steps: ReactNode[];
}

function redirectUri(): string {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '') ?? '';
  return `${base}/functions/v1/gmail-oauth-callback`;
}

const GUIDES: Record<Provider, ProviderSetupGuide | null> = {
  gmail: {
    label: 'Gmail',
    steps: [
      <>
        Go to{' '}
        <a
          href="https://console.cloud.google.com"
          target="_blank"
          rel="noreferrer noopener"
        >
          console.cloud.google.com
        </a>
        , sign in, and create a new project (any name).
      </>,
      <>
        Left menu → <strong>APIs &amp; Services</strong> →{' '}
        <strong>OAuth consent screen</strong> → <strong>Get started</strong>.
        App name: anything. Audience: <strong>External</strong>.
      </>,
      <>
        Left menu → <strong>Audience</strong> → <strong>+ Add Users</strong>{' '}
        → enter the Gmail address you'll connect → <strong>Save</strong>.
      </>,
      <>
        Left menu → <strong>Library</strong> → search <code>Gmail API</code>{' '}
        → <strong>Enable</strong>.
      </>,
      <>
        Left menu → <strong>Credentials</strong> →{' '}
        <strong>+ Create Credentials</strong> → <strong>OAuth client ID</strong>
        . Type: <strong>Web application</strong>.
      </>,
      <>
        Under <strong>Authorized redirect URIs</strong>, paste:
        <div className="oauth-setup__redirect-uri">
          <code>{redirectUri()}</code>
        </div>
        Click <strong>Create</strong>. A popup shows the Client ID and
        Client Secret — copy both and paste them into the form below.
      </>,
    ],
  },
  outlook: null,
  teams: null,
};

// -----------------------------------------------------------------------

interface OAuthSetupModalProps {
  open: boolean;
  provider: Provider;
  onClose: () => void;
}

type View = 'choice' | 'diy' | 'paid';

export function OAuthSetupModal({
  open,
  provider,
  onClose,
}: OAuthSetupModalProps) {
  const { user } = useUser();
  const existing = useIntegrationsStore((s) =>
    s.oauthConfigs.find((c) => c.provider === provider),
  );
  const saveOAuthConfig = useIntegrationsStore((s) => s.saveOAuthConfig);
  const deleteOAuthConfig = useIntegrationsStore((s) => s.deleteOAuthConfig);

  const [view, setView] = useState<View>('choice');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  // Reset whenever the modal opens fresh. If credentials already exist,
  // jump straight to the DIY view so the user can edit them.
  useEffect(() => {
    if (!open) return;
    setClientId(existing?.clientId ?? '');
    setClientSecret('');
    setError(null);
    setConsent(false);
    setView(existing ? 'diy' : 'choice');
  }, [open, existing]);

  const guide = GUIDES[provider];
  if (!guide) return null;

  const submitCreds = async (e: FormEvent) => {
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
    if (ok) onClose();
    else setError('Save failed. Try again.');
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

  const sendPaidRequest = () => {
    const subject = `Daily Dashboard — paid ${guide.label} setup request`;
    const lines = [
      `Hello,`,
      ``,
      `I'd like to request paid assistance setting up the ${guide.label} integration on Daily Dashboard.`,
      ``,
      `Dashboard account: ${user?.email ?? '(please confirm)'}`,
      `Provider: ${guide.label}`,
      `Agreed fee: US $${PAID_SETUP_FEE_USD}`,
      ``,
      `Please reply to confirm payment method and a time to complete the setup.`,
      ``,
      `Thank you.`,
    ].join('\n');
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(lines)}`;
    window.location.href = mailto;
  };

  return (
    <Modal open={open} onClose={onClose} title={`${guide.label} setup`}>
      <div className="oauth-setup">
        <p className="oauth-setup__brief">
          Google requires each application reading Gmail to register with
          their OAuth platform. You have two options: set it up yourself
          (free, ~15 minutes), or request paid assistance from the{' '}
          {ADMIN_NOUN}.
        </p>

        {/* ------------------------------------------------------------ */}
        {/* Choice view                                                   */}
        {/* ------------------------------------------------------------ */}
        {view === 'choice' && (
          <div className="oauth-setup__choices">
            <button
              type="button"
              className="oauth-setup__choice"
              onClick={() => setView('diy')}
            >
              <strong>Do it yourself</strong>
              <span className="oauth-setup__choice-fee">Free</span>
              <span>
                Register your own Google Cloud project, paste the resulting
                credentials below. Step-by-step instructions included.
              </span>
            </button>
            <button
              type="button"
              className="oauth-setup__choice"
              onClick={() => setView('paid')}
            >
              <strong>Request paid setup</strong>
              <span className="oauth-setup__choice-fee">
                US ${PAID_SETUP_FEE_USD}
              </span>
              <span>
                The {ADMIN_NOUN} handles the setup with you. One-time fee,
                no subscription.
              </span>
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* DIY view                                                      */}
        {/* ------------------------------------------------------------ */}
        {view === 'diy' && (
          <>
            <button
              type="button"
              className="oauth-setup__back"
              onClick={() => setView('choice')}
            >
              ← Back
            </button>

            <ol className="oauth-setup__steps">
              {guide.steps.map((node, i) => (
                <li key={i}>{node}</li>
              ))}
            </ol>

            <form className="oauth-setup__form" onSubmit={submitCreds}>
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
                  placeholder={
                    existing
                      ? '••••••••  (hidden — re-enter to update)'
                      : 'GOCSPX-…'
                  }
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
                  {saving
                    ? 'Saving…'
                    : existing
                      ? 'Update'
                      : 'Save credentials'}
                </button>
              </div>
            </form>

            <p className="oauth-setup__support">
              Questions?{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </>
        )}

        {/* ------------------------------------------------------------ */}
        {/* Paid-request view                                             */}
        {/* ------------------------------------------------------------ */}
        {view === 'paid' && (
          <>
            <button
              type="button"
              className="oauth-setup__back"
              onClick={() => setView('choice')}
            >
              ← Back
            </button>

            <div className="oauth-setup__paid">
              <dl className="oauth-setup__summary">
                <dt>Fee</dt>
                <dd>US ${PAID_SETUP_FEE_USD} — one-time, non-recurring.</dd>
                <dt>Provider</dt>
                <dd>{guide.label}</dd>
                <dt>Your dashboard account</dt>
                <dd>{user?.email ?? '—'}</dd>
                <dt>Contact</dt>
                <dd>{SUPPORT_EMAIL}</dd>
              </dl>

              <div className="oauth-setup__scope">
                <strong>What happens next</strong>
                <ol>
                  <li>
                    Submitting this request opens your email client with a
                    pre-filled message to the {ADMIN_NOUN}.
                  </li>
                  <li>
                    The {ADMIN_NOUN} will reply to confirm payment method
                    and arrange a scheduled session.
                  </li>
                  <li>
                    Setup is performed during that session. You retain
                    ownership of your Google account and any credentials
                    issued; the {ADMIN_NOUN} does not store your Google
                    password.
                  </li>
                  <li>
                    Once complete, the credentials are saved in your own
                    dashboard account (encrypted in transit, row-level
                    access restricted to your user).
                  </li>
                </ol>
              </div>

              <label className="oauth-setup__consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  I authorise the {ADMIN_NOUN} to contact me at the email
                  address above regarding this setup request, and I
                  understand that payment terms and scope will be confirmed
                  in writing before any work begins.
                </span>
              </label>

              <div className="oauth-setup__actions">
                <button
                  type="button"
                  className="ghost-btn small-btn"
                  onClick={() => setView('choice')}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn small-btn"
                  onClick={sendPaidRequest}
                  disabled={!consent}
                >
                  Send request
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
