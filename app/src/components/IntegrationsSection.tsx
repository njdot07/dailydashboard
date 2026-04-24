import { useState } from 'react';
import { pingHello } from '../lib/edgeFunctions';
import {
  useIntegrationsStore,
  type Provider,
} from '../stores/integrationsStore';
import { OAuthSetupModal } from './OAuthSetupModal';

interface ProviderCatalogEntry {
  id: Provider;
  label: string;
  hint: string;
  // When false, the Set up button is disabled — widget arrives in a
  // later PR. Gmail is live; Outlook + Teams flip to true in PR 20.
  implemented: boolean;
}

const PROVIDERS: ProviderCatalogEntry[] = [
  {
    id: 'gmail',
    label: 'Gmail',
    hint: 'Read-only inbox preview via the Gmail API (OAuth).',
    implemented: true,
  },
  {
    id: 'outlook',
    label: 'Outlook',
    hint: 'Microsoft email via Microsoft Graph (OAuth).',
    implemented: false,
  },
  {
    id: 'teams',
    label: 'Microsoft Teams',
    hint: 'Recent Teams chats. May require admin consent.',
    implemented: false,
  },
];

type TestState =
  | { kind: 'idle' }
  | { kind: 'pinging' }
  | { kind: 'ok'; userId: string; now: string }
  | { kind: 'error'; message: string };

export function IntegrationsSection() {
  const connections = useIntegrationsStore((s) => s.connections);
  const configs = useIntegrationsStore((s) => s.oauthConfigs);
  const loading = useIntegrationsStore((s) => s.loading);
  const storeError = useIntegrationsStore((s) => s.error);
  const startConnect = useIntegrationsStore((s) => s.startConnect);
  const disconnect = useIntegrationsStore((s) => s.disconnect);

  const [test, setTest] = useState<TestState>({ kind: 'idle' });
  const [setupFor, setSetupFor] = useState<Provider | null>(null);

  const runTest = async () => {
    setTest({ kind: 'pinging' });
    try {
      const res = await pingHello();
      setTest({ kind: 'ok', userId: res.userId, now: res.now });
    } catch (e) {
      setTest({ kind: 'error', message: (e as Error).message });
    }
  };

  const connectionFor = (id: Provider) =>
    connections.find((c) => c.provider === id) ?? null;
  const configFor = (id: Provider) =>
    configs.find((c) => c.provider === id) ?? null;

  return (
    <section className="settings-section">
      <h3 className="settings-section-title">Integrations</h3>
      <p className="settings-section-hint">
        Services that can't be iframed (Gmail, Outlook, Teams) connect via
        OAuth. Each user registers their own OAuth app in the provider's
        console — no shared server-wide credentials, no Google verification
        audit, full control over your own data.
      </p>

      {/* Edge Functions smoke test — kept around so debugging deployment
          stays one click away. */}
      <div className="integrations-test">
        <div>
          <strong>Edge Functions</strong>
          <p className="settings-section-hint">
            Verify your Supabase Edge Functions deployment is reachable.
          </p>
        </div>
        <button
          type="button"
          className="ghost-btn small-btn"
          onClick={runTest}
          disabled={test.kind === 'pinging'}
        >
          {test.kind === 'pinging' ? 'Pinging…' : 'Test connection'}
        </button>
      </div>
      {test.kind === 'ok' && (
        <div className="auth-notice">
          Reached the Edge Function as <code>{test.userId}</code> at{' '}
          {new Date(test.now).toLocaleTimeString()}.
        </div>
      )}
      {test.kind === 'error' && (
        <div className="auth-error">{test.message}</div>
      )}

      {storeError && <div className="auth-error">{storeError}</div>}
      {loading && (
        <p className="settings-section-hint">Loading connection state…</p>
      )}

      <ul className="integrations-list">
        {PROVIDERS.map((p) => {
          const conn = connectionFor(p.id);
          const cfg = configFor(p.id);
          const connected = !!conn;
          const configured = !!cfg;

          // Status text under the provider name
          let status: string;
          if (connected && conn!.accountEmail) {
            status = `Connected as ${conn!.accountEmail}.`;
          } else if (connected) {
            status = 'Connected.';
          } else if (configured) {
            status = 'OAuth credentials saved. Click Connect to authorise.';
          } else {
            status = p.hint;
          }

          return (
            <li key={p.id} className="integration-row">
              <div className="integration-row__main">
                <strong>{p.label}</strong>
                <p>{status}</p>
              </div>
              <div className="integration-row__actions">
                {p.implemented && (
                  <button
                    type="button"
                    className="ghost-btn small-btn"
                    onClick={() => setSetupFor(p.id)}
                    title={
                      configured
                        ? 'Edit or remove your OAuth app credentials'
                        : 'Register your own OAuth app and paste credentials'
                    }
                  >
                    {configured ? 'Edit setup' : 'Set up'}
                  </button>
                )}
                {connected ? (
                  <button
                    type="button"
                    className="ghost-btn small-btn"
                    onClick={() => disconnect(p.id)}
                  >
                    Disconnect
                  </button>
                ) : configured ? (
                  <button
                    type="button"
                    className="primary-btn small-btn"
                    onClick={() => startConnect(p.id)}
                    disabled={!p.implemented}
                  >
                    Connect
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary-btn small-btn"
                    onClick={() => setSetupFor(p.id)}
                    disabled={!p.implemented}
                    title={p.implemented ? undefined : 'Ships in a later PR'}
                  >
                    {p.implemented ? 'Set up' : 'Coming soon'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {setupFor && (
        <OAuthSetupModal
          open={setupFor !== null}
          provider={setupFor}
          onClose={() => setSetupFor(null)}
        />
      )}
    </section>
  );
}
