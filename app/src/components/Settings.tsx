import { useEffect, useState, type FormEvent } from 'react';
import { useUser } from '../providers/UserProvider';
import { useDashboardStore } from '../stores/dashboardStore';
import { WIDGET_REGISTRY } from './widgets/registry';
import { Modal } from './Modal';
import { SecretsSection } from './SecretsSection';
import { DataPortabilitySection } from './DataPortabilitySection';
import {
  THEME_PRESETS,
  isCustomThemeValue,
  resolveThemeUrl,
} from '../lib/theme';

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

  // Theme: either a preset id or a custom URL stored in theme_preference.
  const savedTheme = profile?.theme_preference ?? 'default';
  const savedIsCustom = isCustomThemeValue(savedTheme);
  const [customUrlDraft, setCustomUrlDraft] = useState(
    savedIsCustom ? savedTheme : '',
  );
  const [themeError, setThemeError] = useState<string | null>(null);
  const [applyingCustom, setApplyingCustom] = useState(false);

  // Keep the draft in sync if the profile changes underneath us (e.g. after
  // a successful save) so the input reflects what's actually applied.
  useEffect(() => {
    if (savedIsCustom) setCustomUrlDraft(savedTheme);
  }, [savedTheme, savedIsCustom]);

  const setPresetTheme = async (presetId: string) => {
    setThemeError(null);
    await updateProfile({ theme_preference: presetId });
  };

  const applyCustomTheme = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = customUrlDraft.trim();
    if (!trimmed) return;
    if (!isCustomThemeValue(trimmed)) {
      setThemeError('Paste an http(s):// or data: URL.');
      return;
    }
    setThemeError(null);
    setApplyingCustom(true);
    await updateProfile({ theme_preference: trimmed });
    setApplyingCustom(false);
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
              const instances = widgets.filter((w) => w.type === entry.type);
              const count = instances.length;
              const singleton = entry.singleton !== false;

              if (singleton) {
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
                        checked={count > 0}
                        onChange={() => toggleWidget(entry.type)}
                      />
                    </label>
                  </li>
                );
              }

              // Duplicatable: show count + "+ Add" button. Individual
              // instances can be removed via the × on the widget itself
              // in Edit mode.
              return (
                <li key={entry.type}>
                  <div className="settings-toggle-row">
                    <span className="settings-toggle-row__label">
                      {entry.title}
                    </span>
                    <span className="settings-toggle-row__meta">
                      {count === 0
                        ? 'none'
                        : count === 1
                          ? '1 active'
                          : `${count} active`}
                    </span>
                    <button
                      type="button"
                      className="ghost-btn small-btn"
                      onClick={() => addWidget(entry.type)}
                    >
                      + Add
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* -------- Appearance -------- */}
        <section className="settings-section">
          <h3 className="settings-section-title">Appearance</h3>

          <div className="settings-field">
            <span>Background</span>
            <div className="theme-presets">
              {THEME_PRESETS.map((preset) => {
                const active = !savedIsCustom && savedTheme === preset.id;
                const style: React.CSSProperties = preset.url
                  ? { backgroundImage: `url("${preset.url}")` }
                  : { background: preset.previewBg };
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`theme-preset${active ? ' theme-preset--active' : ''}`}
                    data-preset={preset.id}
                    onClick={() => setPresetTheme(preset.id)}
                    style={style}
                    title={preset.label}
                  >
                    <span className="theme-preset__label">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form className="settings-field" onSubmit={applyCustomTheme}>
            <span>Custom background URL</span>
            <div className="settings-inline-row">
              <input
                type="url"
                value={customUrlDraft}
                onChange={(e) => setCustomUrlDraft(e.target.value)}
                placeholder="https://… or data:image/…"
              />
              <button
                type="submit"
                className="primary-btn small-btn"
                disabled={
                  applyingCustom ||
                  !customUrlDraft.trim() ||
                  customUrlDraft.trim() === savedTheme
                }
              >
                {applyingCustom ? 'Applying…' : 'Apply'}
              </button>
            </div>
            {themeError && <div className="auth-error">{themeError}</div>}
            {savedIsCustom && (
              <div className="theme-preview">
                <span>Current custom background:</span>
                <img
                  src={resolveThemeUrl(savedTheme) ?? ''}
                  alt=""
                  className="theme-preview__img"
                />
              </div>
            )}
            <small className="settings-section-hint">
              Paste the direct image URL (ending in .jpg / .png / .webp) or a
              data: URL. Works with anything your browser can load — Unsplash
              links, personal image host, etc.
            </small>
          </form>

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

        {/* -------- Secret Manager -------- */}
        <SecretsSection />

        {/* -------- Backup & restore -------- */}
        <DataPortabilitySection />

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
