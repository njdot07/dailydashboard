import { useCallback, useEffect, useState } from 'react';
import { useWidgetContext } from '../WidgetContext';
import { useWidgetSettings } from '../../hooks/useWidgetSettings';
import { useIntegrationsStore } from '../../stores/integrationsStore';
import { callEdgeFunction } from '../../lib/edgeFunctions';

interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
}

/**
 * Extract the display name (or email) from a legacy RFC 5322 From header
 * like `"Jane Doe" <jane@example.com>`. Falls back to the raw value.
 */
function extractSender(from: string): string {
  const m = from.match(/^"?([^"<]*?)"?\s*<[^>]+>$/);
  const name = m?.[1]?.trim();
  if (name) return name;
  const emailMatch = from.match(/<([^>]+)>/);
  if (emailMatch?.[1]) return emailMatch[1];
  return from;
}

function relativeTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(diff / 3_600_000);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(diff / 86_400_000);
  return `${days}d`;
}

export function GmailWidget() {
  const { title } = useWidgetContext();
  const { settings } = useWidgetSettings();
  const refreshMinutes = (settings.refreshMinutes as number) ?? 5;

  const connection = useIntegrationsStore((s) =>
    s.connections.find((c) => c.provider === 'gmail'),
  );
  const startConnect = useIntegrationsStore((s) => s.startConnect);

  const [messages, setMessages] = useState<GmailMessage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callEdgeFunction<{ messages: GmailMessage[] }>(
        'gmail-messages',
      );
      setMessages(data.messages);
      setLastFetched(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!connection) return;
    load();
  }, [connection, load]);

  useEffect(() => {
    if (!connection || refreshMinutes <= 0) return;
    const id = window.setInterval(load, refreshMinutes * 60_000);
    return () => clearInterval(id);
  }, [connection, refreshMinutes, load]);

  // ---- Not connected ----
  if (!connection) {
    return (
      <div className="widget widget--gmail glass-panel">
        <h2 className="widget-title">{title}</h2>
        <p className="widget-empty">
          Gmail isn't connected yet. Click below (or head to{' '}
          <em>Settings → Integrations</em>) to authorise.
        </p>
        <button
          type="button"
          className="primary-btn small-btn"
          onClick={() => startConnect('gmail')}
        >
          Connect Gmail
        </button>
      </div>
    );
  }

  // ---- Connected ----
  return (
    <div className="widget widget--gmail glass-panel">
      <div className="widget-header">
        <h2 className="widget-title">{title}</h2>
        <button
          type="button"
          className="ghost-btn small-btn"
          onClick={load}
          disabled={loading}
          title={
            lastFetched
              ? `Last refreshed at ${lastFetched.toLocaleTimeString()}`
              : 'Refresh'
          }
        >
          {loading ? '…' : '↻'}
        </button>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {!messages && !error && (
        <p className="widget-empty">Loading inbox…</p>
      )}

      {messages && messages.length === 0 && (
        <p className="widget-empty">Inbox is empty.</p>
      )}

      {messages && messages.length > 0 && (
        <ul className="gmail-list">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`gmail-row${m.unread ? ' gmail-row--unread' : ''}`}
            >
              <a
                href={`https://mail.google.com/mail/u/0/#inbox/${m.threadId}`}
                target="_blank"
                rel="noreferrer noopener"
                className="gmail-row__link"
              >
                <div className="gmail-row__head">
                  <span className="gmail-row__from">
                    {extractSender(m.from)}
                  </span>
                  <span className="gmail-row__time">
                    {relativeTime(m.date)}
                  </span>
                </div>
                <div className="gmail-row__subject">{m.subject}</div>
                {m.snippet && (
                  <div className="gmail-row__snippet">{m.snippet}</div>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
