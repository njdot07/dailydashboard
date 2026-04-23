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
  url: string;
}

export const THEME_PRESETS: ReadonlyArray<ThemePreset> = [
  { id: 'default', label: 'Marble', url: '/background.png' },
  { id: 'brown', label: 'Brown', url: '/brown.png' },
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

export function resolveThemeUrl(value: string | null | undefined): string {
  const v = (value ?? 'default').trim();
  if (isCustomThemeValue(v)) return v;
  const preset = THEME_PRESETS.find((p) => p.id === v);
  return preset?.url ?? THEME_PRESETS[0]!.url;
}
