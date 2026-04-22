import { useEffect } from 'react';
import { useUser } from '../providers/UserProvider';
import { useDashboardStore } from '../stores/dashboardStore';
import { useTaskReminders } from '../hooks/useTaskReminders';
import { Header } from './Header';
import { Quote } from './widgets/Quote';
import { Clock } from './widgets/Clock';
import { StatusBar } from './widgets/StatusBar';
import { PinnedNotes } from './widgets/PinnedNotes';
import { Launchpad } from './widgets/Launchpad';
import { QuickTasks } from './widgets/QuickTasks';
import { NotesLibrary } from './widgets/NotesLibrary';
import { Calendar } from './widgets/Calendar';

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

  useTaskReminders();

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
            <QuickTasks />
            <Calendar />
            <PinnedNotes />
            <Launchpad />
            <NotesLibrary />
          </div>
        )}
      </main>
    </div>
  );
}
