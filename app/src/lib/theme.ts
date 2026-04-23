// Background theme registry and resolver.
//
// The user's choice lives in user_profiles.theme_preference (existing
// column, text, default 'default'). Two flavours share that column:
//   - 'default' | 'brown' | 'pastel' | 'metallic' → one of the presets
//     listed below (files shipped in app/public/)
//   - anything starting with http(s):// or data:  → custom image URL
//
// This overloading avoids a new migration. The resolver below normalises
// whichever the user saved into a URL we can drop into background-image.

export interface ThemePreset {
  id: string;
  label: string;
  // undefined means CSS-driven (no background image) — styling lives in
  // global.css under .app-shell[data-theme="<id>"]. Used for procedural
  // themes like the brown pattern.
  url?: string;
  // CSS value (gradient / color) used for the settings thumbnail when
  // the preset has no image URL.
  previewBg?: string;
}

export const THEME_PRESETS: ReadonlyArray<ThemePreset> = [
  { id: 'default', label: 'Marble', url: '/background.png' },
  {
    id: 'brown',
    label: 'Brown',
    // No image — brown is drawn by CSS (warm gradient + emoji pattern)
    previewBg: 'linear-gradient(135deg, #a68373 0%, #6b4f42 100%)',
  },
  { id: 'pastel', label: 'Pastel', url: '/pastel.png' },
  { id: 'metallic', label: 'Metallic', url: '/metallic.png' },
];

export function isCustomThemeValue(value: string): boolean {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:')
  );
}

// Returns the image URL for the theme, or null when the theme is CSS-driven
// (caller should then rely on data-theme attribute styling instead).
export function resolveThemeUrl(
  value: string | null | undefined,
): string | null {
  const v = (value ?? 'default').trim();
  if (isCustomThemeValue(v)) return v;
  const preset = THEME_PRESETS.find((p) => p.id === v);
  if (!preset) return THEME_PRESETS[0]!.url ?? null;
  return preset.url ?? null;
}

// Returns the preset id for CSS [data-theme] selectors, or 'custom' for
// user-supplied URLs.
export function resolveThemeId(
  value: string | null | undefined,
): string {
  const v = (value ?? 'default').trim();
  if (isCustomThemeValue(v)) return 'custom';
  return THEME_PRESETS.some((p) => p.id === v) ? v : 'default';
}
