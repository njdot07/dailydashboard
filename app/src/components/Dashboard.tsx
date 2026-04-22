import { useEffect } from 'react';
import { useUser } from '../providers/UserProvider';
import { useDashboardStore } from '../stores/dashboardStore';
import { Header } from './Header';

export function Dashboard() {
  const { user } = useUser();
  const loadDashboard = useDashboardStore((s) => s.loadDashboard);
  const reset = useDashboardStore((s) => s.reset);
  const loading = useDashboardStore((s) => s.loading);
  const error = useDashboardStore((s) => s.error);
  const editMode = useDashboardStore((s) => s.editMode);
  const layout = useDashboardStore((s) => s.layout);

  // Hydrate the dashboard when the authenticated user becomes available.
  useEffect(() => {
    if (!user) return;
    loadDashboard(user.id);
    return () => {
      reset();
    };
  }, [user?.id, loadDashboard, reset]);

  // Drive a body-level class so edit-only CSS (drag handles, gear icons) can
  // key off a single selector once widgets land.
  useEffect(() => {
    document.body.classList.toggle('edit-mode', editMode);
    return () => {
      document.body.classList.remove('edit-mode');
    };
  }, [editMode]);

  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        {loading && <p className="app-status">Loading your dashboard…</p>}
        {error && <p className="app-status app-status--error">{error}</p>}
        {!loading && !error && (
          <div className="placeholder-grid">
            <div className="placeholder-panel">
              <h2>Dashboard ready</h2>
              <p>
                You are signed in. Widgets land in PR 3 — for now, this is the
                empty shell.
              </p>
              <dl className="placeholder-stats">
                <dt>Widgets in layout</dt>
                <dd>{layout.widgets.length}</dd>
                <dt>Mode</dt>
                <dd>{editMode ? 'Edit' : 'View'}</dd>
              </dl>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
