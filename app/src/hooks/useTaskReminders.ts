import { useEffect, useRef } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import { minutesSinceMidnight, todayKey } from '../lib/date';

const REMINDER_OFFSET_MIN = 5;
const CHECK_INTERVAL_MS = 60_000;

/**
 * Checks today's tasks once a minute and fires a browser notification when
 * a task's scheduled time is within REMINDER_OFFSET_MIN from now. Each task
 * is alerted at most once per session (alerted set cleared on mount).
 */
export function useTaskReminders() {
  const tasksData = useDashboardStore(
    (s) => s.layout.widgetData?.['quick-tasks'],
  );
  const alertedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const check = () => {
      const today = todayKey();
      const tasks = tasksData?.tasks[today] ?? [];
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();

      for (const task of tasks) {
        if (task.completed || !task.time) continue;
        if (alertedRef.current.has(task.id)) continue;
        const delta = minutesSinceMidnight(task.time) - nowMin;
        if (delta > 0 && delta <= REMINDER_OFFSET_MIN) {
          alertedRef.current.add(task.id);
          const title = `Task in ${delta} min`;
          const body = task.text;
          if (
            typeof Notification !== 'undefined' &&
            Notification.permission === 'granted'
          ) {
            new Notification(title, { body });
          } else {
            console.log(`[reminder] ${title}: ${body}`);
          }
        }
      }
    };

    check();
    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tasksData]);
}
