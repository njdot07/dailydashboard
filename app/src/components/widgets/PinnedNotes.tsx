import { useState, type KeyboardEvent } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { useWidgetContext } from '../WidgetContext';
import { useDashboardStore } from '../../stores/dashboardStore';
import type { PinnedNote } from '../../lib/types';

const EMPTY: { notes: PinnedNote[] } = { notes: [] };

export function PinnedNotes() {
  const [data, setData] = useWidgetData(EMPTY);
  const { title } = useWidgetContext();
  const editMode = useDashboardStore((s) => s.uiMode === 'edit');
  const [draft, setDraft] = useState('');

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    const note: PinnedNote = {
      id: crypto.randomUUID(),
      text,
      createdAt: new Date().toISOString(),
    };
    setData({ notes: [note, ...data.notes] });
    setDraft('');
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNote();
    }
  };

  const updateNote = (id: string, text: string) => {
    setData({
      notes: data.notes.map((n) => (n.id === id ? { ...n, text } : n)),
    });
  };

  const removeNote = (id: string) => {
    setData({ notes: data.notes.filter((n) => n.id !== id) });
  };

  return (
    <div className="widget widget--pinned-notes glass-panel">
      <h2 className="widget-title">{title}</h2>

      <div className="pin-input-row">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Add a quick note…"
        />
        <button
          type="button"
          className="primary-btn small-btn"
          onClick={addNote}
          disabled={!draft.trim()}
        >
          Pin
        </button>
      </div>

      {data.notes.length === 0 ? (
        <p className="widget-empty">No pinned notes yet.</p>
      ) : (
        <ul className="pinned-notes-list">
          {data.notes.map((note) => (
            <li key={note.id} className="pinned-note">
              {editMode ? (
                <textarea
                  className="pn-text"
                  value={note.text}
                  onChange={(e) => updateNote(note.id, e.target.value)}
                  rows={2}
                />
              ) : (
                <span className="pn-text">{note.text}</span>
              )}
              {editMode && (
                <button
                  type="button"
                  className="item-icon-btn item-icon-btn--delete"
                  onClick={() => removeNote(note.id)}
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
    </div>
  );
}
