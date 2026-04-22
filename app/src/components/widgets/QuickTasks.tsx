import { useState } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { useDashboardStore } from '../../stores/dashboardStore';
import { Modal } from '../Modal';
import { todayKey, nowHM } from '../../lib/date';
import type { QuickTask } from '../../lib/types';

const EMPTY = { tasks: {} as Record<string, QuickTask[]> };

function sortByTime(tasks: QuickTask[]): QuickTask[] {
  return [...tasks].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

export function QuickTasks() {
  const [data, setData] = useWidgetData('quick-tasks', EMPTY);
  const editMode = useDashboardStore((s) => s.uiMode === 'edit');
  const [modalTask, setModalTask] = useState<QuickTask | null>(null);
  const [isNew, setIsNew] = useState(false);

  const today = todayKey();
  const todayTasks = sortByTime(data.tasks[today] ?? []);

  const openNewModal = () => {
    setModalTask({
      id: crypto.randomUUID(),
      text: '',
      time: nowHM(),
      duration: 30,
      completed: false,
    });
    setIsNew(true);
  };

  const openEditModal = (task: QuickTask) => {
    setModalTask({ ...task });
    setIsNew(false);
  };

  const closeModal = () => {
    setModalTask(null);
    setIsNew(false);
  };

  const saveModal = () => {
    if (!modalTask) return;
    const text = modalTask.text.trim();
    if (!text) return;

    const list = data.tasks[today] ?? [];
    const next = isNew
      ? [...list, { ...modalTask, text }]
      : list.map((t) => (t.id === modalTask.id ? { ...modalTask, text } : t));

    setData({ tasks: { ...data.tasks, [today]: next } });
    closeModal();
  };

  const toggleComplete = (id: string) => {
    const list = data.tasks[today] ?? [];
    const next = list.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    );
    setData({ tasks: { ...data.tasks, [today]: next } });
  };

  const removeTask = (id: string) => {
    const list = data.tasks[today] ?? [];
    const next = list.filter((t) => t.id !== id);
    setData({ tasks: { ...data.tasks, [today]: next } });
  };

  return (
    <div className="widget widget--tasks glass-panel">
      <div className="widget-header">
        <h2 className="widget-title">Today</h2>
        <button
          type="button"
          className="primary-btn small-btn"
          onClick={openNewModal}
        >
          + Add
        </button>
      </div>

      {todayTasks.length === 0 ? (
        <p className="widget-empty">No tasks for today.</p>
      ) : (
        <ul className="task-list">
          {todayTasks.map((task) => (
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

            <div className="form-row">
              <label>
                <span>Time</span>
                <input
                  type="time"
                  value={modalTask.time}
                  onChange={(e) =>
                    setModalTask({ ...modalTask, time: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Duration (min)</span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={modalTask.duration}
                  onChange={(e) =>
                    setModalTask({
                      ...modalTask,
                      duration: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
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
