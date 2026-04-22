import { useEffect, useMemo, useState } from 'react';
import { useDashboardStore } from '../../stores/dashboardStore';
import {
  buildMonthCells,
  dateKey,
  formatLongDate,
  formatMonthYear,
  shiftMonth,
  todayKey,
} from '../../lib/date';
import type { QuickTask } from '../../lib/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Calendar() {
  const tasksData = useDashboardStore(
    (s) => s.layout.widgetData?.['quick-tasks'],
  );
  const selectedDate = useDashboardStore((s) => s.selectedDate);
  const setSelectedDate = useDashboardStore((s) => s.setSelectedDate);

  const [cursor, setCursor] = useState(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return new Date(y!, (m ?? 1) - 1, 1);
  });

  // Keep cursor month in sync with selectedDate so that external changes
  // (QuickTasks day nav, other future integrations) bring the grid along.
  useEffect(() => {
    const [y, mo] = selectedDate.split('-').map(Number);
    if (
      y !== cursor.getFullYear() ||
      (mo ?? 1) - 1 !== cursor.getMonth()
    ) {
      setCursor(new Date(y!, (mo ?? 1) - 1, 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const cells = useMemo(() => buildMonthCells(cursor), [cursor]);

  const tasksByDate = tasksData?.tasks ?? {};

  const selectedTasks: QuickTask[] = useMemo(() => {
    const list = tasksByDate[selectedDate] ?? [];
    return [...list].sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  }, [tasksByDate, selectedDate]);

  return (
    <div className="widget widget--calendar glass-panel">
      <div className="widget-header">
        <h2 className="widget-title">Calendar</h2>
        <div className="cal-nav">
          <button
            type="button"
            className="cal-nav-btn"
            onClick={() => setCursor(shiftMonth(cursor, -1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="cal-month-label">{formatMonthYear(cursor)}</span>
          <button
            type="button"
            className="cal-nav-btn"
            onClick={() => setCursor(shiftMonth(cursor, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="cal-weekday-row">
        {WEEKDAYS.map((d) => (
          <span key={d} className="cal-weekday">
            {d}
          </span>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((cell) => {
          const count = (tasksByDate[cell.key] ?? []).length;
          const cls = [
            'cal-cell',
            cell.inMonth ? '' : 'cal-cell--other',
            cell.isToday ? 'cal-cell--today' : '',
            cell.key === selectedDate ? 'cal-cell--selected' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={cell.key}
              type="button"
              className={cls}
              onClick={() => setSelectedDate(cell.key)}
            >
              <span className="cal-cell-day">{cell.day}</span>
              {count > 0 && <span className="cal-cell-count">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="cal-preview">
        <h3 className="cal-preview-title">
          {selectedDate === dateKey(new Date()) ? 'Today · ' : ''}
          {formatLongDate(selectedDate)}
        </h3>
        {selectedTasks.length === 0 ? (
          <p className="widget-empty">No tasks.</p>
        ) : (
          <ul className="cal-preview-list">
            {selectedTasks.map((task) => (
              <li
                key={task.id}
                className={`cal-preview-item${task.completed ? ' completed' : ''}`}
              >
                {task.time && (
                  <span className="cal-preview-time">{task.time}</span>
                )}
                <span className="cal-preview-text">{task.text}</span>
              </li>
            ))}
          </ul>
        )}
        {selectedDate !== todayKey() && (
          <button
            type="button"
            className="day-nav-today"
            onClick={() => setSelectedDate(todayKey())}
          >
            Jump to today
          </button>
        )}
      </div>
    </div>
  );
}
