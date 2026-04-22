import { useState } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { useDashboardStore } from '../../stores/dashboardStore';
import { Modal } from '../Modal';
import type { Note } from '../../lib/types';

const EMPTY = { notes: [] as Note[] };

function preview(body: string, max = 90): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd() + '…';
}

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function NotesLibrary() {
  const [data, setData] = useWidgetData('notes', EMPTY);
  const editMode = useDashboardStore((s) => s.uiMode === 'edit');
  const [editing, setEditing] = useState<Note | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => {
    setEditing({
      id: crypto.randomUUID(),
      title: '',
      body: '',
      updatedAt: new Date().toISOString(),
    });
    setIsNew(true);
  };

  const openEdit = (note: Note) => {
    setEditing({ ...note });
    setIsNew(false);
  };

  const close = () => {
    setEditing(null);
    setIsNew(false);
  };

  const save = () => {
    if (!editing) return;
    const title = editing.title.trim() || 'Untitled';
    const next = { ...editing, title, updatedAt: new Date().toISOString() };
    const list = isNew
      ? [next, ...data.notes]
      : data.notes.map((n) => (n.id === next.id ? next : n));
    setData({ notes: list });
    close();
  };

  const remove = (id: string) => {
    setData({ notes: data.notes.filter((n) => n.id !== id) });
  };

  // Notes sorted by most-recently-updated first.
  const sorted = [...data.notes].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  return (
    <div className="widget widget--notes glass-panel">
      <div className="widget-header">
        <h2 className="widget-title">Notes</h2>
        <button
          type="button"
          className="primary-btn small-btn"
          onClick={openNew}
        >
          + New note
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="widget-empty">No notes yet.</p>
      ) : (
        <ul className="notes-list">
          {sorted.map((note) => (
            <li key={note.id} className="note-row">
              <button
                type="button"
                className="note-row-main"
                onClick={() => openEdit(note)}
              >
                <span className="note-row-title">{note.title || 'Untitled'}</span>
                {note.body.trim() && (
                  <span className="note-row-preview">{preview(note.body)}</span>
                )}
                <span className="note-row-meta">{formatUpdated(note.updatedAt)}</span>
              </button>
              {editMode && (
                <button
                  type="button"
                  className="item-icon-btn item-icon-btn--delete"
                  onClick={() => remove(note.id)}
                  aria-label="Delete note"
                  title="Delete"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={close}
        title={isNew ? 'New note' : 'Edit note'}
      >
        {editing && (
          <form
            className="note-form"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label>
              <span>Title</span>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                autoFocus
              />
            </label>
            <label>
              <span>Body</span>
              <textarea
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                rows={8}
              />
            </label>
            <div className="form-actions">
              <button type="button" className="ghost-btn" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="primary-btn">
                {isNew ? 'Create' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
