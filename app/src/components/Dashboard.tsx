import { useEffect } from 'react';
import { useUser } from '../providers/UserProvider';
import { useDashboardStore } from '../stores/dashboardStore';
import { Header } from './Header';
import { Quote } from './widgets/Quote';
import { Clock } from './widgets/Clock';
import { StatusBar } from './widgets/StatusBar';

export function Dashboard() {
  const { user } = useUser();
  const loadDashboard = useDashboardStore((s) => s.loadDashboard);
  const reset = useDashboardStore((s) => s.reset);
  const loading = useDashboardStore((s) => s.loading);
  const error = useDashboardStore((s) => s.error);
  const editMode = useDashboardStore((s) => s.editMode);

  useEffect(() => {
    if (!user) return;
    loadDashboard(user.id);
    return () => {
      reset();
    };
  }, [user?.id, loadDashboard, reset]);

  useEffect(() => {
    document.body.classList.toggle('edit-mode', editMode);
    return () => {
      document.body.classList.remove('edit-mode');
    };
  }, [editMode]);

  return (
    <div className="app-shell">
      <div className="app-shell__overlay" aria-hidden />
      <Header />
      <main className="app-main">
        <Quote />
        {loading && <p className="app-status">Loading your dashboard…</p>}
        {error && <p className="app-status app-status--error">{error}</p>}
        {!loading && !error && (
          <div className="dashboard-grid">
            <StatusBar />
            <Clock />
          </div>
        )}
      </main>
    </div>
  );
}
