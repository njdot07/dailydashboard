import { useState, type FormEvent } from 'react';
import { useUser } from '../providers/UserProvider';
import { useDashboardStore } from '../stores/dashboardStore';
import { WIDGET_REGISTRY } from './widgets/registry';
import { Modal } from './Modal';

type ToneKey = 'professional' | 'motivational' | 'minimalist' | 'friendly';
const TONES: ToneKey[] = ['professional', 'motivational', 'minimalist', 'friendly'];

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export function Settings({ open, onClose }: SettingsProps) {
  const { profile, user, updateProfile, signOut } = useUser();
  const widgets = useDashboardStore((s) => s.layout.widgets);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const removeWidget = useDashboardStore((s) => s.removeWidget);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Reset dirty state whenever the modal opens fresh.
  const currentName = profile?.display_name ?? '';
  const nameDirty = displayName.trim() !== currentName;

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!nameDirty) return;
    setNameSaving(true);
    setNameSaved(false);
    const { error } = await updateProfile({
      display_name: displayName.trim() || null,
    });
    setNameSaving(false);
    if (!error) {
      setNameSaved(true);
      window.setTimeout(() => setNameSaved(false), 1500);
    }
  };

  const tone =
    (profile?.persona_tone as ToneKey) ?? 'professional';

  const setTone = async (next: ToneKey) => {
    await updateProfile({ persona_tone: next });
  };

  const toggleWidget = (type: string) => {
    const existing = widgets.find((w) => w.type === type);
    if (existing) {
      removeWidget(existing.i);
    } else {
      addWidget(type);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="settings">
        {/* -------- Widgets -------- */}
        <section className="settings-section">
          <h3 className="settings-section-title">Widgets on dashboard</h3>
          <p className="settings-section-hint">
            Toggle which widgets appear on your dashboard. Removed widgets
            keep their content — you can add them back any time.
          </p>
          <ul className="settings-widget-list">
            {Object.values(WIDGET_REGISTRY).map((entry) => {
              const added = widgets.some((w) => w.type === entry.type);
              return (
                <li key={entry.type}>
                  <label className="settings-toggle-row">
                    <span className="settings-toggle-row__label">
                      {entry.title}
                    </span>
                    <span className="settings-toggle-row__meta">
                      {entry.defaultSize.w}×{entry.defaultSize.h}
                    </span>
                    <input
                      type="checkbox"
                      checked={added}
                      onChange={() => toggleWidget(entry.type)}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        {/* -------- Appearance -------- */}
        <section className="settings-section">
          <h3 className="settings-section-title">Appearance</h3>
          <label className="settings-field">
            <span>Persona tone</span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as ToneKey)}
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <p className="settings-section-hint">
            Drives the Status Bar's idle and next-task messages.
          </p>
        </section>

        {/* -------- Account -------- */}
        <section className="settings-section">
          <h3 className="settings-section-title">Account</h3>
          <form className="settings-field" onSubmit={saveName}>
            <span>Display name</span>
            <div className="settings-inline-row">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
              <button
                type="submit"
                className="primary-btn small-btn"
                disabled={!nameDirty || nameSaving}
              >
                {nameSaving ? 'Saving…' : nameSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </form>

          <div className="settings-field">
            <span>Email</span>
            <span className="settings-readonly">{user?.email}</span>
          </div>

          <div className="settings-field">
            <button
              type="button"
              className="ghost-btn"
              onClick={async () => {
                onClose();
                await signOut();
              }}
            >
              Sign out
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
