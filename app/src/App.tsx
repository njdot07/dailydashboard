import { useEffect, useState } from 'react';
import { supabase, hasSupabaseConfig } from './lib/supabase';

type ConnectionState = 'idle' | 'checking' | 'reachable' | 'unreachable';

function App() {
  const [connection, setConnection] = useState<ConnectionState>('idle');

  useEffect(() => {
    if (!supabase) return;
    setConnection('checking');
    supabase.auth
      .getSession()
      .then(({ error }) => setConnection(error ? 'unreachable' : 'reachable'))
      .catch(() => setConnection('unreachable'));
  }, []);

  return (
    <main className="scaffold">
      <h1>Daily Dashboard</h1>
      <p className="subtitle">PR 1 — scaffolding + schema</p>

      {!hasSupabaseConfig && (
        <div className="warning">
          Supabase not configured. Copy <code>app/.env.example</code> to{' '}
          <code>app/.env.local</code> and fill in <code>VITE_SUPABASE_URL</code>{' '}
          and <code>VITE_SUPABASE_ANON_KEY</code>.
        </div>
      )}

      {hasSupabaseConfig && (
        <p>
          Supabase:{' '}
          <span className={`status status--${connection}`}>{connection}</span>
        </p>
      )}
    </main>
  );
}

export default App;
