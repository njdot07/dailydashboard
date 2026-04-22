import { hasSupabaseConfig } from './lib/supabase';
import { UserProvider, useUser } from './providers/UserProvider';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';

function NotConfigured() {
  return (
    <main className="scaffold">
      <h1>Daily Dashboard</h1>
      <div className="warning">
        Supabase not configured. Copy <code>app/.env.example</code> to{' '}
        <code>app/.env.local</code> and fill in <code>VITE_SUPABASE_URL</code>{' '}
        and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
      </div>
    </main>
  );
}

function Routes() {
  const { session, loading } = useUser();

  if (loading) {
    return (
      <main className="scaffold">
        <p className="app-status">Loading…</p>
      </main>
    );
  }

  return session ? <Dashboard /> : <AuthScreen />;
}

function App() {
  if (!hasSupabaseConfig) {
    return <NotConfigured />;
  }
  return (
    <UserProvider>
      <Routes />
    </UserProvider>
  );
}

export default App;
