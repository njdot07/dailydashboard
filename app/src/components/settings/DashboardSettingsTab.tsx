import { useEffect, useState, type FormEvent } from 'react';
import { useUser } from '../../providers/UserProvider';
import { useDashboardStore } from '../../stores/dashboardStore';
import { WIDGET_REGISTRY } from '../widgets/registry';
import {
  THEME_PRESETS,
  formatThemeValue,
  parseThemeValue,
  isCustomThemeValue,
  resolveThemeUrl,
} from '../../lib/theme';

type ToneKey = 'professional' | 'motivational' | 'minimalist' | 'friendly';
const TONES: ToneKey[] = [
  'professional',
  'motivational',
  'minimalist',
  'friendly',
];

/**
 * Dashboard-layout and appearance controls:
 * which widgets are on the dashboard, theme preset, custom background,
 * and persona tone. Extracted out of Settings.tsx so the tabbed shell
 * can mount it lazily.
 */
export function DashboardSettingsTab() {
  const { profile, updateProfile } = useUser();
  const widgets = useDashboardStore((s) => s.layout.widgets);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const removeWidget = useDashboardStore((s) => s.removeWidget);

  const tone = (profile?.persona_tone as ToneKey) ?? 'professional';
  const setTone = async (next: ToneKey) => {
    await updateProfile({ persona_tone: next });
  };

  const savedTheme = profile?.theme_preference ?? 'default';
  const savedParsed = parseThemeValue(savedTheme);
  const savedIsCustom = isCustomThemeValue(savedTheme);
  const [customUrlDraft, setCustomUrlDraft] = useState(
    savedParsed.url ?? '',
  );
  const [themeError, setThemeError] = useState<string | null>(null);
  const [applyingCustom, setApplyingCustom] = useState(false);

  useEffect(() => {
    setCustomUrlDraft(savedParsed.url ?? '');
    // parseThemeValue is pure so just depend on savedTheme
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedTheme]);

  const setPresetTheme = async (presetId: string) => {
    setThemeError(null);
    const next = formatThemeValue(presetId, savedParsed.url);
    await updateProfile({ theme_preference: next });
  };

  const applyCustomTheme = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = customUrlDraft.trim();
    if (!trimmed) {
      setThemeError(null);
      setApplyingCustom(true);
      await updateProfile({
        theme_preference: formatThemeValue(savedParsed.styleId, null),
      });
      setApplyingCustom(false);
      return;
    }
    if (
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('data:')
    ) {
      setThemeError('Paste an http(s):// or data: URL.');
      return;
    }
    setThemeError(null);
    setApplyingCustom(true);
    await updateProfile({
      theme_preference: formatThemeValue(savedParsed.styleId, trimmed),
    });
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
    <>
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

      <section className="settings-section">
        <h3 className="settings-section-title">Appearance</h3>

        <div className="settings-field">
          <span>Background</span>
          <div className="theme-presets">
            {THEME_PRESETS.map((preset) => {
              const active = savedParsed.styleId === preset.id;
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
          {savedIsCustom && savedParsed.url && (
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
            Paste any http(s) or data: image URL. The active preset above
            still controls the widget style — so you can mix your own
            background with, say, the pastel bubbles look. Leave blank and
            Apply to remove the custom background.
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
    </>
  );
}
