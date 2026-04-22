// Declarative per-widget settings schema. Each widget in the registry may
// expose a flat map of field name → SettingField. The WidgetSettingsModal
// renders a form from the schema automatically.
//
// Kept intentionally narrow (number / select / text / boolean) so the
// modal stays simple. If a widget needs something richer — colour picker,
// nested groups, etc. — the plan is to let it ship its own panel rather
// than bloat this union.

export type SettingField =
  | {
      type: 'number';
      label: string;
      default: number;
      min?: number;
      max?: number;
      step?: number;
      hint?: string;
    }
  | {
      type: 'select';
      label: string;
      default: string;
      options: ReadonlyArray<{ value: string; label: string }>;
      hint?: string;
    }
  | {
      type: 'text';
      label: string;
      default: string;
      placeholder?: string;
      hint?: string;
    }
  | {
      type: 'boolean';
      label: string;
      default: boolean;
      hint?: string;
    };

export type SettingsSchema = Readonly<Record<string, SettingField>>;

// Pull the plain default values out of a schema — used to seed a widget's
// settings blob the first time it's opened.
export function defaultsFor(schema: SettingsSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    out[key] = field.default;
  }
  return out;
}

// Take a stored value (might be anything — user-saved JSON from
// localStorage/Supabase) and either coerce it back into something valid
// for this field, or fall back to the field's default.
export function resolveSetting(field: SettingField, stored: unknown): unknown {
  if (stored === null || stored === undefined) return field.default;
  switch (field.type) {
    case 'number': {
      if (typeof stored !== 'number' || Number.isNaN(stored)) return field.default;
      if (field.min !== undefined && stored < field.min) return field.min;
      if (field.max !== undefined && stored > field.max) return field.max;
      return stored;
    }
    case 'select':
      if (typeof stored !== 'string') return field.default;
      return field.options.some((o) => o.value === stored)
        ? stored
        : field.default;
    case 'text':
      return typeof stored === 'string' ? stored : field.default;
    case 'boolean':
      return typeof stored === 'boolean' ? stored : field.default;
  }
}

// Resolve every field in the schema against a stored settings blob.
export function resolveSettings(
  schema: SettingsSchema,
  stored: Record<string, unknown> | undefined | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const src = stored ?? {};
  for (const [key, field] of Object.entries(schema)) {
    out[key] = resolveSetting(field, src[key]);
  }
  return out;
}
