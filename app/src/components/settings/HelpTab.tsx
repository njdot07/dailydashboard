import { useState } from 'react';

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

const FAQS: FaqItem[] = [
  {
    q: 'The Gmail widget shows "Gmail authorisation has expired"',
    a: (
      <>
        <p>
          This is expected roughly every 7 days while the OAuth app is in
          Google's <strong>Testing</strong> mode. Google deliberately
          invalidates refresh tokens on that schedule until the app
          completes their verification process (which, for Gmail scopes,
          requires a paid security audit).
        </p>
        <p>
          <strong>Fix:</strong> Settings → Integrations → Gmail → click{' '}
          <strong>Reconnect</strong>. You'll be sent through Google's
          consent screen again and a fresh refresh token is issued.
        </p>
      </>
    ),
  },
  {
    q: 'Connecting Gmail fails with "Access blocked: Authorization Error / invalid_client"',
    a: (
      <>
        <p>
          The Client ID saved under your integration is not a valid Google
          OAuth client ID. Real IDs always end in{' '}
          <code>.apps.googleusercontent.com</code>. If you see an email
          address or any other value in the{' '}
          <code>client_id=</code> query string on the error page, that's
          what's stored.
        </p>
        <p>
          <strong>Fix:</strong> open{' '}
          <a
            href="https://console.cloud.google.com"
            target="_blank"
            rel="noreferrer noopener"
          >
            Google Cloud Console
          </a>{' '}
          → your project → <strong>APIs &amp; Services → Credentials</strong>,
          copy the <strong>Client ID</strong> (and reset / copy the Client
          Secret), then paste both into Settings → Integrations → Gmail →{' '}
          <strong>Edit setup</strong>.
        </p>
      </>
    ),
  },
  {
    q: 'A widget shows "Edge Function returned a non-2xx status code"',
    a: (
      <>
        <p>
          This used to be a catch-all error that hid the real cause; the
          app now unwraps the underlying response so you'll see specific
          messages (e.g. "Gmail authorisation has expired", "OAuth
          credentials are missing"). If you still see the generic
          message, your Supabase deployment's Edge Functions may be
          unreachable.
        </p>
        <p>
          <strong>Fix:</strong> open Settings → Integrations → click{' '}
          <strong>Test connection</strong> under "Edge Functions". If that
          also fails, the deployment is down — contact support.
        </p>
      </>
    ),
  },
  {
    q: 'The Secret Manager won\'t unlock',
    a: (
      <>
        <p>
          The master passphrase never leaves your browser, so there's no
          way for anyone (including the {' '}
          <em>Dashboard Administrator</em>) to recover it for you. If the
          passphrase is lost, the vault ciphertext is unreadable.
        </p>
        <p>
          <strong>Fix:</strong> clear the vault and re-enter your secrets
          with a new passphrase. In Supabase, the encrypted rows can be
          deleted from the <code>user_secrets</code> table — contact{' '}
          <a href="mailto:dailydashboard@gmail.com">dailydashboard@gmail.com</a>{' '}
          if you need help wiping them.
        </p>
      </>
    ),
  },
  {
    q: 'Widget layout isn\'t saving between sessions',
    a: (
      <>
        <p>
          Layout changes save to Supabase automatically a moment after you
          drop a widget. If a save failed (network error, sign-out mid-
          edit), re-opening the dashboard may restore the previous state.
        </p>
        <p>
          <strong>Fix:</strong> make sure you're signed in (Header → your
          initials), drag a widget again, and watch the browser console
          for errors. Persistent failures usually mean the Supabase row-
          level security policy needs a fresh session — sign out and back
          in.
        </p>
      </>
    ),
  },
  {
    q: 'How do I back up my dashboard?',
    a: (
      <>
        <p>
          Settings → Backup → <strong>Export</strong> downloads a JSON
          snapshot of your layout, widget settings, and profile
          preferences. OAuth tokens and vault ciphertext are not included
          (tokens are account-bound; vault rows already sync
          independently).
        </p>
        <p>
          Re-import the snapshot on any device to restore the same
          dashboard.
        </p>
      </>
    ),
  },
  {
    q: 'Something else is broken',
    a: (
      <>
        <p>
          Email{' '}
          <a href="mailto:dailydashboard@gmail.com">
            dailydashboard@gmail.com
          </a>{' '}
          with a short description of what happened and, if possible, a
          screenshot of the error. Include the approximate time so the
          logs can be correlated.
        </p>
      </>
    ),
  },
];

/**
 * Help + troubleshooting. Static FAQ with collapsible answers and a
 * contact pointer. Written for a non-developer audience — surfaced
 * errors are paraphrased in plain language rather than reprinting raw
 * error codes.
 */
export function HelpTab() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="settings-section settings-help">
      <h3 className="settings-section-title">Help &amp; troubleshooting</h3>
      <p className="settings-section-hint">
        Common issues and how to resolve them. Click a question to expand.
      </p>

      <ul className="faq">
        {FAQS.map((item, i) => (
          <li key={i} className={`faq__item${openIndex === i ? ' faq__item--open' : ''}`}>
            <button
              type="button"
              className="faq__question"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              aria-expanded={openIndex === i}
            >
              <span>{item.q}</span>
              <span className="faq__chevron">
                {openIndex === i ? '▾' : '▸'}
              </span>
            </button>
            {openIndex === i && (
              <div className="faq__answer">{item.a}</div>
            )}
          </li>
        ))}
      </ul>

      <p className="settings-section-hint">
        Can't find your issue? Email{' '}
        <a href="mailto:dailydashboard@gmail.com">dailydashboard@gmail.com</a>{' '}
        — include a short description and, if possible, a screenshot.
      </p>
    </section>
  );
}
