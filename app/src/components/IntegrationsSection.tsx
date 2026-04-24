import { useState } from 'react';
import { pingHello } from '../lib/edgeFunctions';

// Static catalogue of providers we plan to support. Connect buttons are
// disabled in PR 17 — PR 18 fills in Gmail, PR 19 fills in Outlook + Teams.
interface ProviderCatalogEntry {
  id: 'gmail' | 'outlook' | 'teams';
  label: string;
  hint: string;
}

const PROVIDERS: ProviderCatalogEntry[] = [
  {
    id: 'gmail',
    label: 'Gmail',
    hint: 'Read-only inbox preview via the Gmail API (OAuth).',
  },
  {
    id: 'outlook',
    label: 'Outlook',
    hint: 'Microsoft email via Microsoft Graph (OAuth).',
  },
  {
    id: 'teams',
    label: 'Microsoft Teams',
    hint: 'Recent Teams chats. May require admin consent.',
  },
];

type TestState =
  | { kind: 'idle' }
  | { kind: 'pinging' }
  | { kind: 'ok'; userId: string; now: string }
  | { kind: 'error'; message: string };

export function IntegrationsSection() {
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

  return (
    <section className="settings-section">
      <h3 className="settings-section-title">Integrations</h3>
      <p className="settings-section-hint">
        Connect services that can't be iframed (Gmail, Outlook, Teams) via
        OAuth. Once connected, dedicated widgets read messages / chats from
        the provider's API. Each service ships in a later PR —
        this section wires the backbone.
      </p>

      {/* Deployment smoke test — PR 17 only. Once PR 18 is live this block
          collapses into each provider row's own connection state. */}
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
          {new Date(test.now).toLocaleTimeString()}. Backbone is live.
        </div>
      )}
      {test.kind === 'error' && (
        <div className="auth-error">{test.message}</div>
      )}

      <ul className="integrations-list">
        {PROVIDERS.map((p) => (
          <li key={p.id} className="integration-row">
            <div className="integration-row__main">
              <strong>{p.label}</strong>
              <p>{p.hint}</p>
            </div>
            <button
              type="button"
              className="ghost-btn small-btn"
              disabled
              title="Ships in a later PR"
            >
              Coming soon
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
