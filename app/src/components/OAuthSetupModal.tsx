import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Modal } from './Modal';
import { useUser } from '../providers/UserProvider';
import {
  useIntegrationsStore,
  type Provider,
} from '../stores/integrationsStore';

// -----------------------------------------------------------------------
// Configurable constants — edit here if the contact email, fees, or
// package composition change.
// -----------------------------------------------------------------------
const SUPPORT_EMAIL = 'dailydashboard@gmail.com';
const ADMIN_NOUN = 'Dashboard Administrator';

type PackageId = 'single' | 'core' | 'full';

interface PackageDef {
  id: PackageId;
  label: string;
  price: number;
  summary: string;
}

const PACKAGES: PackageDef[] = [
  {
    id: 'single',
    label: 'Single integration',
    price: 19,
    summary: 'Any one app of your choice (core or custom).',
  },
  {
    id: 'core',
    label: 'Core bundle',
    price: 39,
    summary: 'Gmail + Outlook + Microsoft Teams.',
  },
  {
    id: 'full',
    label: 'Full bundle',
    price: 59,
    summary: 'Core bundle plus up to 2 custom integrations.',
  },
];

// Target can be a real OAuth provider (gmail / outlook / teams) or
// 'custom' — a purely-request flow for apps not yet offered.
export type SetupTarget = Provider | 'custom';

const TARGET_LABEL: Record<SetupTarget, string> = {
  gmail: 'Gmail',
  outlook: 'Outlook',
  teams: 'Microsoft Teams',
  custom: 'Custom integration',
};

// Per-provider DIY walkthrough. Presence of a guide controls whether the
// "Do it yourself" choice is offered. null ⇒ paid-only path.
interface ProviderSetupGuide {
  steps: ReactNode[];
}

function redirectUri(): string {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '') ?? '';
  return `${base}/functions/v1/gmail-oauth-callback`;
}

const GUIDES: Record<SetupTarget, ProviderSetupGuide | null> = {
  gmail: {
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
  custom: null,
};

// -----------------------------------------------------------------------

interface OAuthSetupModalProps {
  open: boolean;
  target: SetupTarget;
  onClose: () => void;
}

type View = 'choice' | 'diy' | 'paid';

export function OAuthSetupModal({
  open,
  target,
  onClose,
}: OAuthSetupModalProps) {
  const { user } = useUser();

  // Existing OAuth credentials only exist for real providers that have
  // a DIY flow. For 'custom' the lookup simply yields undefined.
  const existing = useIntegrationsStore((s) =>
    target === 'custom'
      ? undefined
      : s.oauthConfigs.find((c) => c.provider === target),
  );
  const saveOAuthConfig = useIntegrationsStore((s) => s.saveOAuthConfig);
  const deleteOAuthConfig = useIntegrationsStore((s) => s.deleteOAuthConfig);

  const guide = GUIDES[target];
  const targetLabel = TARGET_LABEL[target];

  const [view, setView] = useState<View>('choice');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  // Paid-path state
  const [packageId, setPackageId] = useState<PackageId>('single');
  const [customApps, setCustomApps] = useState('');
  const [whyOpen, setWhyOpen] = useState(false);

  // Reset whenever the modal opens fresh. If this is a non-DIY target
  // (outlook/teams/custom) skip straight to the paid view. If credentials
  // already exist for a DIY provider, jump to the DIY form to edit them.
  useEffect(() => {
    if (!open) return;
    setClientId(existing?.clientId ?? '');
    setClientSecret('');
    setError(null);
    setConsent(false);
    setCustomApps('');
    setWhyOpen(false);
    setPackageId('single');
    if (!guide) {
      setView('paid');
    } else if (existing) {
      setView('diy');
    } else {
      setView('choice');
    }
  }, [open, existing, guide]);

  const selectedPackage = useMemo(
    () => PACKAGES.find((p) => p.id === packageId)!,
    [packageId],
  );
  const needsCustomApps = packageId === 'full' || target === 'custom';

  const submitCreds = async (e: FormEvent) => {
    e.preventDefault();
    if (!guide || target === 'custom') return;
    const cid = clientId.trim();
    const cs = clientSecret.trim();
    if (!cid || !cs) {
      setError('Both the Client ID and the Client Secret are required.');
      return;
    }
    setSaving(true);
    setError(null);
    const ok = await saveOAuthConfig(target as Provider, cid, cs);
    setSaving(false);
    if (ok) onClose();
    else setError('Save failed. Try again.');
  };

  const onDelete = async () => {
    if (target === 'custom') return;
    if (
      !confirm(
        'Remove your OAuth credentials? Any active connection will stop refreshing.',
      )
    ) {
      return;
    }
    await deleteOAuthConfig(target as Provider);
    onClose();
  };

  const describeIntegrations = (): string => {
    if (packageId === 'core') return 'Gmail + Outlook + Microsoft Teams';
    if (packageId === 'full') {
      return `Gmail + Outlook + Microsoft Teams + custom apps${
        customApps.trim() ? ` (${customApps.trim()})` : ''
      }`;
    }
    // single
    if (target === 'custom') {
      return customApps.trim()
        ? `Custom integration: ${customApps.trim()}`
        : 'Custom integration (to be specified)';
    }
    return targetLabel;
  };

  const sendPaidRequest = () => {
    const subject = `Daily Dashboard — setup request (${selectedPackage.label}, US $${selectedPackage.price})`;
    const lines = [
      `Hello,`,
      ``,
      `I'd like to request paid assistance setting up the following on Daily Dashboard:`,
      `  ${describeIntegrations()}`,
      ``,
      `Dashboard account: ${user?.email ?? '(please confirm)'}`,
      `Package: ${selectedPackage.label} — US $${selectedPackage.price} (${selectedPackage.summary})`,
      ``,
      `Please reply to confirm payment method, the secure credential-transfer channel, and a time to complete the setup.`,
      ``,
      `Thank you.`,
    ].join('\n');
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(lines)}`;
    window.location.href = mailto;
  };

  // Title copy differs slightly for custom vs real providers.
  const title =
    target === 'custom'
      ? 'Custom integration request'
      : `${targetLabel} setup`;

  // Brief paragraph varies: DIY-capable providers mention both options.
  const briefText = guide ? (
    <>
      {targetLabel} requires each application reading your data to register
      with the provider's OAuth platform. You have two options: set it up
      yourself (free, ~15 minutes) or request paid assistance from the{' '}
      {ADMIN_NOUN}.
    </>
  ) : target === 'custom' ? (
    <>
      Don't see the app you need? Request a paid custom integration — the{' '}
      {ADMIN_NOUN} will scope, implement, and connect it to your dashboard.
    </>
  ) : (
    <>
      {targetLabel} integration is coordinated through the {ADMIN_NOUN}.
      Select a package below to request a setup session.
    </>
  );

  const showBack = view !== 'choice' && !!guide;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="oauth-setup">
        <p className="oauth-setup__brief">{briefText}</p>

        {/* ------------------------------------------------------------ */}
        {/* Choice view (only when a DIY guide exists for this target)   */}
        {/* ------------------------------------------------------------ */}
        {view === 'choice' && guide && (
          <div className="oauth-setup__choices">
            <button
              type="button"
              className="oauth-setup__choice"
              onClick={() => setView('diy')}
            >
              <strong>Do it yourself</strong>
              <span className="oauth-setup__choice-fee">Free</span>
              <span>
                Register your own {targetLabel === 'Gmail' ? 'Google Cloud' : 'provider'}{' '}
                project, paste the resulting credentials. Step-by-step
                instructions included.
              </span>
            </button>
            <button
              type="button"
              className="oauth-setup__choice"
              onClick={() => setView('paid')}
            >
              <strong>Request paid setup</strong>
              <span className="oauth-setup__choice-fee">From US $19</span>
              <span>
                The {ADMIN_NOUN} handles the setup with you. One-time fee,
                no subscription. Bundle discounts available.
              </span>
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* DIY view                                                      */}
        {/* ------------------------------------------------------------ */}
        {view === 'diy' && guide && (
          <>
            {showBack && (
              <button
                type="button"
                className="oauth-setup__back"
                onClick={() => setView('choice')}
              >
                ← Back
              </button>
            )}

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
            {showBack && (
              <button
                type="button"
                className="oauth-setup__back"
                onClick={() => setView('choice')}
              >
                ← Back
              </button>
            )}

            <div className="oauth-setup__paid">
              <fieldset className="oauth-setup__packages">
                <legend>Choose a package</legend>
                {PACKAGES.map((p) => (
                  <label key={p.id} className="oauth-setup__package">
                    <input
                      type="radio"
                      name="package"
                      value={p.id}
                      checked={packageId === p.id}
                      onChange={() => setPackageId(p.id)}
                    />
                    <span className="oauth-setup__package-body">
                      <span className="oauth-setup__package-head">
                        <strong>{p.label}</strong>
                        <span className="oauth-setup__package-price">
                          US ${p.price}
                        </span>
                      </span>
                      <span className="oauth-setup__package-summary">
                        {p.summary}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <button
                type="button"
                className="oauth-setup__why-toggle"
                onClick={() => setWhyOpen((v) => !v)}
                aria-expanded={whyOpen}
              >
                {whyOpen ? '▾' : '▸'} Click here to understand why these
                prices
              </button>

              {whyOpen && (
                <div className="oauth-setup__why">
                  <p>
                    These fees reflect the full scope of the work, not just
                    hands-on time. Because the setup happens on{' '}
                    <strong>your</strong> accounts — not the {ADMIN_NOUN}'s —
                    it requires careful coordination and live verification
                    rather than a scripted install, plus the following
                    safeguards:
                  </p>
                  <ul>
                    <li>
                      <strong>Secure credential transfer.</strong> Sensitive
                      values (OAuth secrets, API keys) are shared through a
                      one-time encrypted channel, never over plain email or
                      chat.
                    </li>
                    <li>
                      <strong>Documented privacy practice.</strong> A written
                      record of what was accessed during setup is provided
                      so you can verify exactly what was handled on your
                      behalf.
                    </li>
                    <li>
                      <strong>Guaranteed data erasure.</strong> Once your
                      integration is live and confirmed working, the{' '}
                      {ADMIN_NOUN} erases all personal information collected
                      during setup — access notes, temporary tokens,
                      screen-share recordings, any shared credentials — on a
                      documented schedule and provides written confirmation.
                    </li>
                  </ul>
                </div>
              )}

              {needsCustomApps && (
                <label className="oauth-setup__customapps">
                  <span>
                    {packageId === 'full'
                      ? 'Custom apps to include (up to 2)'
                      : 'Which custom app would you like?'}
                  </span>
                  <textarea
                    value={customApps}
                    onChange={(e) => setCustomApps(e.target.value)}
                    placeholder={
                      packageId === 'full'
                        ? 'e.g. Notion, Asana'
                        : 'e.g. Notion — inbox preview and recent pages'
                    }
                    rows={2}
                  />
                </label>
              )}

              <dl className="oauth-setup__summary">
                <dt>Fee</dt>
                <dd>
                  US ${selectedPackage.price} — one-time, non-recurring.
                </dd>
                <dt>Scope</dt>
                <dd>{describeIntegrations()}</dd>
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
                    The {ADMIN_NOUN} replies to confirm payment method, the
                    secure credential-transfer channel, and a scheduled
                    session.
                  </li>
                  <li>
                    Setup is performed during that session. You retain
                    ownership of your accounts and any credentials issued.
                  </li>
                  <li>
                    Once complete, credentials are saved in your own
                    dashboard account (encrypted in transit, row-level
                    access restricted to your user), and all personal
                    information collected for setup is erased with written
                    confirmation.
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
                  understand that payment terms, scope, and data-handling
                  procedures will be confirmed in writing before any work
                  begins.
                </span>
              </label>

              <div className="oauth-setup__actions">
                <button
                  type="button"
                  className="ghost-btn small-btn"
                  onClick={showBack ? () => setView('choice') : onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn small-btn"
                  onClick={sendPaidRequest}
                  disabled={
                    !consent || (needsCustomApps && !customApps.trim())
                  }
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
