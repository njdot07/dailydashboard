import { useState } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { useDashboardStore } from '../../stores/dashboardStore';
import { Modal } from '../Modal';
import { todayKey, nowHM, dateKey } from '../../lib/date';
import type { QuickTask } from '../../lib/types';

const EMPTY = { tasks: {} as Record<string, QuickTask[]> };

export const TASK_COLORS = [
  '#6366f1', // indigo (default)
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#10b981', // green
  '#06b6d4', // cyan
  '#8b5cf6', // purple
  '#ec4899', // pink
];

interface TaskDraft extends QuickTask {
  date: string;
}

function sortByTime(tasks: QuickTask[]): QuickTask[] {
  return [...tasks].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

function shiftDate(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function formatDayLabel(key: string): string {
  if (key === todayKey()) return 'Today';
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d);
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function QuickTasks() {
  const [data, setData] = useWidgetData('quick-tasks', EMPTY);
  const editMode = useDashboardStore((s) => s.uiMode === 'edit');
  const selectedDate = useDashboardStore((s) => s.selectedDate);
  const setSelectedDate = useDashboardStore((s) => s.setSelectedDate);
  const [modalTask, setModalTask] = useState<TaskDraft | null>(null);
  const [originalDate, setOriginalDate] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const dayTasks = sortByTime(data.tasks[selectedDate] ?? []);

  const openNewModal = () => {
    setModalTask({
      id: crypto.randomUUID(),
      text: '',
      time: nowHM(),
      duration: 30,
      completed: false,
      color: TASK_COLORS[0]!,
      date: selectedDate,
    });
    setOriginalDate(null);
    setIsNew(true);
  };

  const openEditModal = (task: QuickTask) => {
    setModalTask({ ...task, color: task.color ?? TASK_COLORS[0]!, date: selectedDate });
    setOriginalDate(selectedDate);
    setIsNew(false);
  };

  const closeModal = () => {
    setModalTask(null);
    setOriginalDate(null);
    setIsNew(false);
  };

  const saveModal = () => {
    if (!modalTask) return;
    const text = modalTask.text.trim();
    if (!text) return;

    const { date, ...taskFields } = modalTask;
    const cleanTask: QuickTask = { ...taskFields, text };

    const nextTasks = { ...data.tasks };

    // If the date changed on an edit, remove from the old date first.
    if (!isNew && originalDate && originalDate !== date) {
      nextTasks[originalDate] = (nextTasks[originalDate] ?? []).filter(
        (t) => t.id !== cleanTask.id,
      );
    }

    const targetList = nextTasks[date] ?? [];
    nextTasks[date] = isNew
      ? [...targetList, cleanTask]
      : targetList.some((t) => t.id === cleanTask.id)
        ? targetList.map((t) => (t.id === cleanTask.id ? cleanTask : t))
        : [...targetList, cleanTask];

    setData({ tasks: nextTasks });
    closeModal();
  };

  const toggleComplete = (id: string) => {
    const list = data.tasks[selectedDate] ?? [];
    const next = list.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    );
    setData({ tasks: { ...data.tasks, [selectedDate]: next } });
  };

  const removeTask = (id: string) => {
    const list = data.tasks[selectedDate] ?? [];
    const next = list.filter((t) => t.id !== id);
    setData({ tasks: { ...data.tasks, [selectedDate]: next } });
  };

  return (
    <div className="widget widget--tasks glass-panel">
      <div className="widget-header">
        <div className="day-nav">
          <button
            type="button"
            className="day-nav-btn"
            onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
            aria-label="Previous day"
          >
            ‹
          </button>
          <span className="day-nav-label" title={selectedDate}>
            {formatDayLabel(selectedDate)}
          </span>
          <button
            type="button"
            className="day-nav-btn"
            onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
            aria-label="Next day"
          >
            ›
          </button>
        </div>
        <button
          type="button"
          className="primary-btn small-btn"
          onClick={openNewModal}
        >
          + Add
        </button>
      </div>

      {selectedDate !== todayKey() && (
        <button
          type="button"
          className="day-nav-today"
          onClick={() => setSelectedDate(todayKey())}
        >
          Jump to today
        </button>
      )}

      {dayTasks.length === 0 ? (
        <p className="widget-empty">No tasks for this day.</p>
      ) : (
        <ul className="task-list">
          {dayTasks.map((task) => (
            <li
              key={task.id}
              className={`task-item${task.completed ? ' completed' : ''}`}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleComplete(task.id)}
                aria-label={`Mark ${task.text} complete`}
              />
              <span
                className="task-color-dot"
                style={{ background: task.color ?? TASK_COLORS[0] }}
                aria-hidden
              />
              <span className="task-text">{task.text}</span>
              {task.time && <span className="task-time-badge">{task.time}</span>}
              {editMode && (
                <>
                  <button
                    type="button"
                    className="item-icon-btn"
                    onClick={() => openEditModal(task)}
                    aria-label="Edit task"
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="item-icon-btn item-icon-btn--delete"
                    onClick={() => removeTask(task.id)}
                    aria-label="Delete task"
                    title="Delete"
                  >
                    ×
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(modalTask)}
        onClose={closeModal}
        title={isNew ? 'New task' : 'Edit task'}
      >
        {modalTask && (
          <form
            className="task-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveModal();
            }}
          >
            <label>
              <span>Task</span>
              <input
                type="text"
                value={modalTask.text}
                onChange={(e) =>
                  setModalTask({ ...modalTask, text: e.target.value })
                }
                autoFocus
                required
              />
            </label>

            <label>
              <span>Date</span>
              <input
                type="date"
                value={modalTask.date}
                onChange={(e) =>
                  setModalTask({ ...modalTask, date: e.target.value || todayKey() })
                }
              />
            </label>

            <div className="form-row">
              <label>
                <span>Start</span>
                <input
                  type="time"
                  value={modalTask.time}
                  onChange={(e) =>
                    setModalTask({ ...modalTask, time: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Duration (min) — 0 for none</span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={modalTask.duration}
                  onChange={(e) =>
                    setModalTask({
                      ...modalTask,
                      duration: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </label>
            </div>

            <div className="task-color-picker">
              <span className="task-color-picker__label">Color</span>
              <div className="task-color-picker__swatches">
                {TASK_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`task-color-swatch${
                      modalTask.color === c ? ' task-color-swatch--active' : ''
                    }`}
                    style={{ background: c }}
                    onClick={() => setModalTask({ ...modalTask, color: c })}
                    aria-label={`Use ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="ghost-btn" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="primary-btn">
                {isNew ? 'Add task' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
