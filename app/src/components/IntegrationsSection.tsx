import { useState } from 'react';
import { pingHello } from '../lib/edgeFunctions';
import {
  useIntegrationsStore,
  type Provider,
} from '../stores/integrationsStore';

interface ProviderCatalogEntry {
  id: Provider;
  label: string;
  hint: string;
  // When false, Connect button is disabled ("not shipped yet"). Gmail
  // is live in PR 18; Outlook + Teams flip to true in PR 19.
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
  const loading = useIntegrationsStore((s) => s.loading);
  const storeError = useIntegrationsStore((s) => s.error);
  const startConnect = useIntegrationsStore((s) => s.startConnect);
  const disconnect = useIntegrationsStore((s) => s.disconnect);

  const [test, setTest] = useState<TestState>({ kind: 'idle' });

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

  return (
    <section className="settings-section">
      <h3 className="settings-section-title">Integrations</h3>
      <p className="settings-section-hint">
        Services that can't be iframed (Gmail, Outlook, Teams) connect via
        OAuth. Once connected, their widget reads from the provider's API.
      </p>

      {/* Edge Functions smoke test — keep around so debugging deployment
          issues stays one click away. */}
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
          const connected = !!conn;
          return (
            <li key={p.id} className="integration-row">
              <div className="integration-row__main">
                <strong>{p.label}</strong>
                <p>
                  {connected
                    ? `Connected${conn!.accountEmail ? ` as ${conn!.accountEmail}` : ''}.`
                    : p.hint}
                </p>
              </div>
              {connected ? (
                <button
                  type="button"
                  className="ghost-btn small-btn"
                  onClick={() => disconnect(p.id)}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-btn small-btn"
                  onClick={() => startConnect(p.id)}
                  disabled={!p.implemented}
                  title={
                    p.implemented ? undefined : 'Ships in a later PR'
                  }
                >
                  {p.implemented ? 'Connect' : 'Coming soon'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
