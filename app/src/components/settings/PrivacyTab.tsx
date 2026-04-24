/**
 * Plain-English privacy statement. Surfaced inside the Settings modal
 * so users can inspect exactly what's stored where before connecting
 * integrations or using the Secret Manager.
 */
export function PrivacyTab() {
  return (
    <section className="settings-section settings-privacy">
      <h3 className="settings-section-title">Privacy statement</h3>
      <p className="settings-section-hint">
        A short, plain-English summary of what this dashboard stores, where
        it stores it, and who can read it. No marketing language — just
        the facts.
      </p>

      <h4 className="settings-subtitle">What stays on your device only</h4>
      <ul className="settings-prose">
        <li>
          The <strong>Secret Manager master passphrase</strong> never leaves
          your browser. It's used to derive an encryption key in your
          session memory; when you close the tab, the derived key is
          discarded.
        </li>
        <li>
          <strong>Vault ciphertext is decrypted locally.</strong> Even
          though the encrypted values sync to your Supabase account, no
          server has the key to read them — only your browser, after you
          type the passphrase.
        </li>
        <li>
          Any content you view inside iframe <strong>Embed widgets</strong>{' '}
          (YouTube, Spotify, Google Calendar, etc.) is fetched directly
          from that third-party by your browser. Daily Dashboard never
          sees what's inside those iframes.
        </li>
      </ul>

      <h4 className="settings-subtitle">What syncs to your Supabase account</h4>
      <ul className="settings-prose">
        <li>
          <strong>Your dashboard layout and widget settings</strong> —
          widget positions, sizes, titles, and per-widget configuration
          (e.g. refresh intervals, custom URLs, quote tone). Row-level
          security restricts every row to the authenticated owner.
        </li>
        <li>
          <strong>Profile preferences</strong> — display name, theme
          choice, persona tone.
        </li>
        <li>
          <strong>OAuth credentials you enter for integrations</strong> —
          Client ID and Client Secret for Gmail/Outlook/Teams, stored
          per-user. These are used exclusively by the Edge Functions to
          initiate and refresh OAuth flows for your own connections.
        </li>
        <li>
          <strong>OAuth access + refresh tokens</strong> returned by the
          provider (e.g. Google). These are stored encrypted-at-rest by
          Supabase and are never returned to the browser — only Edge
          Functions running on the server side use them to fetch your
          inbox, calendar, etc.
        </li>
      </ul>

      <h4 className="settings-subtitle">What the Edge Functions can see</h4>
      <ul className="settings-prose">
        <li>
          Edge Functions execute on Supabase infrastructure and are
          scoped to your authenticated user. They read your stored OAuth
          credentials + tokens, call the provider's API (e.g. Gmail), and
          return only the trimmed response needed by the widget (message
          metadata, not full email bodies beyond short snippets).
        </li>
        <li>
          Functions do not log full response payloads. Error logs include
          status codes and short text but not personal content.
        </li>
      </ul>

      <h4 className="settings-subtitle">What third parties see</h4>
      <ul className="settings-prose">
        <li>
          <strong>Google / Microsoft</strong> see the OAuth requests you
          approve (scopes requested, your consent, the redirect back to
          this dashboard). They do not see Daily Dashboard's other users
          or your dashboard contents.
        </li>
        <li>
          <strong>Supabase</strong> hosts the database and Edge Functions;
          it sees the rows described above and the execution of the
          functions. It does not have access to your plaintext vault
          secrets, which are encrypted in the browser before upload.
        </li>
      </ul>

      <h4 className="settings-subtitle">Your controls</h4>
      <ul className="settings-prose">
        <li>
          <strong>Disconnect</strong> any integration at any time in the
          Integrations tab — doing so deletes the stored tokens.
        </li>
        <li>
          <strong>Remove credentials</strong> via the Edit setup form to
          purge your saved OAuth app Client ID and Secret from the
          database.
        </li>
        <li>
          <strong>Clear the vault</strong> by removing individual secrets
          in the Vault tab, or by re-running the setup with a fresh
          passphrase.
        </li>
        <li>
          <strong>Account deletion</strong> — contact{' '}
          <a href="mailto:dailydashboard@gmail.com">dailydashboard@gmail.com</a>{' '}
          for a full account wipe (profile, layout, integrations, vault
          ciphertext).
        </li>
      </ul>

      <p className="settings-section-hint">
        Questions or concerns about data handling? Email{' '}
        <a href="mailto:dailydashboard@gmail.com">dailydashboard@gmail.com</a>.
      </p>
    </section>
  );
}
