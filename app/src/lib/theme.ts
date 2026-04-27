// Theme registry + resolver.
//
// The user's choice lives in user_profiles.theme_preference (existing
// text column). Value formats, in order of specificity:
//
//   'default' | 'brown' | 'pastel' | 'metallic'
//       A preset. Preset owns BOTH the background (image or CSS) AND
//       the widget styling tokens.
//
//   '<preset>|<url>'
//       Custom background image + preset widget styling. Pipe-delimited.
//       e.g. 'pastel|https://example.com/bg.jpg' uses the pastel widget
//       tokens but swaps the background for the user's URL.
//
//   'http(s)://...' | 'data:...'
//       Bare URL — legacy format. Assumes 'default' (marble) widget
//       styling. Kept for backward compat with older profiles.
//
// The resolver returns a { styleId, url } pair so both Dashboard
// (inline --bg-url) and the CSS (data-theme attribute) can cooperate.

export interface ThemePreset {
  id: string;
  label: string;
  /** Undefined means CSS-driven (no background image) — e.g. brown. */
  url?: string;
  /** Fallback CSS value for the settings preset thumbnail. */
  previewBg?: string;
}

export const THEME_PRESETS: ReadonlyArray<ThemePreset> = [
  { id: 'default', label: 'Marble', url: '/background.png' },
  {
    id: 'brown',
    label: 'Brown',
    previewBg: 'linear-gradient(135deg, #a68373 0%, #6b4f42 100%)',
  },
  { id: 'pastel', label: 'Pastel', url: '/pastel.png' },
  { id: 'metallic', label: 'Metallic', url: '/metallic.png' },
];

const PRESET_IDS = THEME_PRESETS.map((p) => p.id);

function isUrlLike(value: string): boolean {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:')
  );
}

function isPresetId(value: string): boolean {
  return PRESET_IDS.includes(value);
}

/** Still kept for the "is this a http/data custom value?" check. */
export function isCustomThemeValue(value: string): boolean {
  // True when the value carries a user-provided URL somewhere.
  return isUrlLike(value) || (value.includes('|') && isUrlLike(value.split('|', 2)[1] ?? ''));
}

export interface ResolvedTheme {
  /** Preset id used for .app-shell[data-theme="…"] selector. */
  styleId: string;
  /** URL for background-image, or null when CSS draws the background. */
  url: string | null;
}

export function parseThemeValue(raw: string | null | undefined): ResolvedTheme {
  const v = (raw ?? 'default').trim();
  if (!v) return { styleId: 'default', url: THEME_PRESETS[0]!.url ?? null };

  if (v.includes('|')) {
    const [styleRaw, urlRaw] = v.split('|', 2);
    const styleId = isPresetId(styleRaw ?? '') ? (styleRaw as string) : 'default';
    const url = urlRaw && isUrlLike(urlRaw) ? urlRaw : null;
    return { styleId, url };
  }
  if (isUrlLike(v)) {
    return { styleId: 'default', url: v };
  }
  if (isPresetId(v)) {
    const preset = THEME_PRESETS.find((p) => p.id === v)!;
    return { styleId: v, url: preset.url ?? null };
  }
  return { styleId: 'default', url: THEME_PRESETS[0]!.url ?? null };
}

/**
 * Produce the storage value for a given styleId + optional custom URL.
 * Pure presets are stored as the bare id; custom URLs get the pipe form.
 */
export function formatThemeValue(styleId: string, customUrl: string | null): string {
  if (customUrl && isUrlLike(customUrl)) {
    return `${styleId}|${customUrl}`;
  }
  return styleId;
}

// Legacy-friendly wrappers (kept so earlier call sites don't break).

export function resolveThemeUrl(value: string | null | undefined): string | null {
  return parseThemeValue(value).url;
}

export function resolveThemeId(value: string | null | undefined): string {
  return parseThemeValue(value).styleId;
}
