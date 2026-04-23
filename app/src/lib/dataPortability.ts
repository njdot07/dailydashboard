// Backup + restore for dashboard widget data.
//
// Supports two formats:
//
// 1. Native "daily-dashboard/v1" — what exportDashboard() produces. Just the
//    four widget-data slices with a small header for identification:
//
//      {
//        "__format": "daily-dashboard/v1",
//        "__exportedAt": "2026-04-23T12:34:56.000Z",
//        "pinned-notes": { "notes": [...] },
//        "launchpad":   { "categories": [...] },
//        "quick-tasks": { "tasks": {...} },
//        "notes":       { "notes": [...] }
//      }
//
// 2. Legacy fs_user_data — the old vanilla dashboard's localStorage shape.
//    Detected by the presence of top-level `pinnedNotes`, `settings`, or
//    date-keyed entries (YYYY-MM-DD). Mapped into the native shape by the
//    same adapter originally built for the one-shot migration.

import type {
  LaunchpadCategory,
  LaunchpadLink,
  LayoutConfig,
  Note,
  PinnedNote,
  QuickTask,
  WidgetDataMap,
  WidgetInstance,
} from './types';
import { getWidgetEntry } from '../components/widgets/registry';

const NATIVE_FORMAT_ID = 'daily-dashboard/v1';

export type ImportMode = 'merge' | 'replace';

export interface ImportPreview {
  format: 'native' | 'legacy';
  pinnedNotes: number;
  launchpadCategories: number;
  launchpadLinks: number;
  taskDates: number;
  tasksTotal: number;
  notesFromThoughts: number;
  exportedAt?: string;
}

export interface ImportResult {
  preview: ImportPreview;
  payload: {
    'pinned-notes'?: { notes: PinnedNote[] };
    launchpad?: { categories: LaunchpadCategory[] };
    'quick-tasks'?: { tasks: Record<string, QuickTask[]> };
    notes?: { notes: Note[] };
  };
}

// ============================================================
// Export (current layout → downloadable JSON)
// ============================================================

export function downloadExport(layout: LayoutConfig): void {
  const json = exportDashboardFromLayout(layout);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const a = document.createElement('a');
  a.href = url;
  a.download = `daily-dashboard-backup-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ============================================================
// Import (detect format, parse, normalise)
// ============================================================

type Raw = Record<string, unknown>;

function randomId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function detectFormat(obj: Raw): 'native' | 'legacy' | 'unknown' {
  if (typeof obj.__format === 'string' && obj.__format === NATIVE_FORMAT_ID) {
    return 'native';
  }
  // Native format even without header, if any of our slice keys are present.
  if (
    obj['pinned-notes'] !== undefined ||
    obj['launchpad'] !== undefined ||
    obj['quick-tasks'] !== undefined ||
    obj['notes'] !== undefined
  ) {
    return 'native';
  }
  // Legacy: top-level pinnedNotes, settings, or a YYYY-MM-DD key.
  if (obj.pinnedNotes !== undefined || obj.settings !== undefined) {
    return 'legacy';
  }
  if (Object.keys(obj).some((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))) {
    return 'legacy';
  }
  return 'unknown';
}

// ----- native parser (widgetData is already the right shape; we just sanity-check) -----

function parseNative(obj: Raw): ImportResult {
  const out: ImportResult['payload'] = {};

  const pin = obj['pinned-notes'];
  if (pin && typeof pin === 'object' && Array.isArray((pin as Raw).notes)) {
    out['pinned-notes'] = { notes: (pin as { notes: PinnedNote[] }).notes };
  }

  const lp = obj.launchpad;
  if (lp && typeof lp === 'object' && Array.isArray((lp as Raw).categories)) {
    out.launchpad = {
      categories: (lp as { categories: LaunchpadCategory[] }).categories,
    };
  }

  const qt = obj['quick-tasks'];
  if (qt && typeof qt === 'object' && (qt as Raw).tasks && typeof (qt as Raw).tasks === 'object') {
    out['quick-tasks'] = {
      tasks: (qt as { tasks: Record<string, QuickTask[]> }).tasks,
    };
  }

  const n = obj.notes;
  if (n && typeof n === 'object' && Array.isArray((n as Raw).notes)) {
    out.notes = { notes: (n as { notes: Note[] }).notes };
  }

  const preview: ImportPreview = {
    format: 'native',
    pinnedNotes: out['pinned-notes']?.notes.length ?? 0,
    launchpadCategories: out.launchpad?.categories.length ?? 0,
    launchpadLinks:
      out.launchpad?.categories.reduce((n, c) => n + c.links.length, 0) ?? 0,
    taskDates: out['quick-tasks'] ? Object.keys(out['quick-tasks'].tasks).length : 0,
    tasksTotal:
      out['quick-tasks']
        ? Object.values(out['quick-tasks'].tasks).reduce(
            (acc, arr) => acc + arr.length,
            0,
          )
        : 0,
    notesFromThoughts: 0,
    exportedAt:
      typeof obj.__exportedAt === 'string' ? obj.__exportedAt : undefined,
  };

  return { preview, payload: out };
}

// ----- legacy parser (maps fs_user_data → native widgetData) -----

function parseDurationLike(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string') {
    const m = /([\d.]+)\s*(h|min|m)/i.exec(value.trim());
    if (!m) return 0;
    const n = parseFloat(m[1]!);
    const unit = m[2]!.toLowerCase();
    if (unit === 'h') return Math.round(n * 60);
    return Math.round(n);
  }
  return 0;
}

function mapPinnedNotes(arr: unknown): PinnedNote[] {
  if (!Array.isArray(arr)) return [];
  const now = new Date().toISOString();
  return arr
    .map((raw): PinnedNote | null => {
      if (!raw || typeof raw !== 'object') return null;
      const text =
        typeof (raw as { text?: unknown }).text === 'string'
          ? (raw as { text: string }).text
          : null;
      if (!text) return null;
      return {
        id:
          typeof (raw as { id?: unknown }).id === 'string'
            ? (raw as { id: string }).id
            : randomId(),
        text,
        createdAt: now,
      };
    })
    .filter((n): n is PinnedNote => n !== null);
}

function mapLaunchpad(raw: unknown): LaunchpadCategory[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((cat): LaunchpadCategory | null => {
      if (!cat || typeof cat !== 'object') return null;
      const c = cat as {
        id?: unknown;
        name?: unknown;
        open?: unknown;
        links?: unknown;
      };
      const links: LaunchpadLink[] = Array.isArray(c.links)
        ? c.links
            .map((l): LaunchpadLink | null => {
              if (!l || typeof l !== 'object') return null;
              const link = l as {
                id?: unknown;
                name?: unknown;
                url?: unknown;
                icon?: unknown;
              };
              const url = typeof link.url === 'string' ? link.url : '';
              const linkName = typeof link.name === 'string' ? link.name : url;
              if (!url && !linkName) return null;
              return {
                id: typeof link.id === 'string' ? link.id : randomId(),
                name: linkName || url,
                url,
                icon: typeof link.icon === 'string' ? link.icon : '🔗',
              };
            })
            .filter((x): x is LaunchpadLink => x !== null)
        : [];
      return {
        id: typeof c.id === 'string' ? c.id : randomId(),
        name: typeof c.name === 'string' ? c.name : 'Untitled',
        open: typeof c.open === 'boolean' ? c.open : false,
        links,
      };
    })
    .filter((c): c is LaunchpadCategory => c !== null);
}

function mapTask(raw: unknown): QuickTask | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as {
    id?: unknown;
    text?: unknown;
    time?: unknown;
    duration?: unknown;
    completed?: unknown;
    color?: unknown;
  };
  const text = typeof r.text === 'string' ? r.text : null;
  if (!text) return null;
  return {
    id: typeof r.id === 'string' ? r.id : randomId(),
    text,
    time: typeof r.time === 'string' ? r.time : '',
    duration: parseDurationLike(r.duration),
    completed: Boolean(r.completed),
    color: typeof r.color === 'string' ? r.color : undefined,
  };
}

interface ThoughtSection {
  title?: unknown;
  items?: unknown;
}
interface ThoughtSpace {
  title?: unknown;
  sections?: unknown;
}

function mapThoughtsToNotes(blob: Raw): Note[] {
  const notes: Note[] = [];
  const now = new Date().toISOString();
  for (const [dateKey, dayRaw] of Object.entries(blob)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    if (!dayRaw || typeof dayRaw !== 'object') continue;
    const day = dayRaw as { thoughtSpaces?: unknown };
    if (!Array.isArray(day.thoughtSpaces)) continue;
    for (const space of day.thoughtSpaces as ThoughtSpace[]) {
      if (!space || typeof space !== 'object') continue;
      const spaceTitle =
        typeof space.title === 'string' ? space.title : 'Thoughts';
      if (!Array.isArray(space.sections)) continue;
      for (const section of space.sections as ThoughtSection[]) {
        if (!section || typeof section !== 'object') continue;
        const sectionTitle =
          typeof section.title === 'string' ? section.title : 'Untitled';
        const items = Array.isArray(section.items)
          ? (section.items as unknown[])
              .map((it) =>
                it &&
                typeof it === 'object' &&
                typeof (it as { text?: unknown }).text === 'string'
                  ? ((it as { text: string }).text || '').trim()
                  : '',
              )
              .filter(Boolean)
          : [];
        if (items.length === 0) continue;
        notes.push({
          id: randomId(),
          title: `${spaceTitle} · ${sectionTitle} (${dateKey})`,
          body: items.join('\n\n'),
          updatedAt: now,
        });
      }
    }
  }
  return notes;
}

function parseLegacy(obj: Raw): ImportResult {
  const pinned = mapPinnedNotes(obj.pinnedNotes);

  const settings =
    obj.settings && typeof obj.settings === 'object'
      ? (obj.settings as Raw)
      : {};
  const launchpad = mapLaunchpad(settings.launchpadCategories);

  const tasksByDate: Record<string, QuickTask[]> = {};
  let tasksTotal = 0;
  for (const [key, dayRaw] of Object.entries(obj)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    if (!dayRaw || typeof dayRaw !== 'object') continue;
    const day = dayRaw as { tasks?: unknown };
    if (!Array.isArray(day.tasks)) continue;
    const mapped = (day.tasks as unknown[])
      .map(mapTask)
      .filter((t): t is QuickTask => t !== null);
    if (mapped.length) {
      tasksByDate[key] = mapped;
      tasksTotal += mapped.length;
    }
  }

  const notes = mapThoughtsToNotes(obj);

  const payload: ImportResult['payload'] = {};
  if (pinned.length) payload['pinned-notes'] = { notes: pinned };
  if (launchpad.length) payload.launchpad = { categories: launchpad };
  if (Object.keys(tasksByDate).length) {
    payload['quick-tasks'] = { tasks: tasksByDate };
  }
  if (notes.length) payload.notes = { notes };

  const preview: ImportPreview = {
    format: 'legacy',
    pinnedNotes: pinned.length,
    launchpadCategories: launchpad.length,
    launchpadLinks: launchpad.reduce((n, c) => n + c.links.length, 0),
    taskDates: Object.keys(tasksByDate).length,
    tasksTotal,
    notesFromThoughts: notes.length,
  };

  return { preview, payload };
}

// ----- public entrypoint -----

export function parseImport(json: string): ImportResult {
  const trimmed = json.trim();
  if (!trimmed) throw new Error('Paste JSON first.');
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    throw new Error('That does not look like valid JSON.');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Expected an object at the top level.');
  }
  const obj = data as Raw;
  const format = detectFormat(obj);
  if (format === 'native') return parseNative(obj);
  if (format === 'legacy') return parseLegacy(obj);
  throw new Error(
    'Could not recognise this JSON. Expected a dashboard backup (native format) or legacy fs_user_data.',
  );
}

// ============================================================
// Apply (merge or replace) — routes each type-keyed payload slice into the
// first widget of that type, creating a new widget at the bottom of the
// grid if none exists.
// ============================================================

function nextY(widgets: WidgetInstance[]): number {
  if (widgets.length === 0) return 0;
  return Math.max(...widgets.map((w) => w.y + w.h));
}

// Ensure a widget of this type exists; return its instance id + the
// (possibly extended) widgets array.
function ensureWidgetOfType(
  widgets: WidgetInstance[],
  type: string,
): { widgets: WidgetInstance[]; id: string } {
  const existing = widgets.find((w) => w.type === type);
  if (existing) return { widgets, id: existing.i };
  const entry = getWidgetEntry(type);
  const id = `${type}-${
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  }`;
  const widget: WidgetInstance = {
    i: id,
    type,
    x: 0,
    y: nextY(widgets),
    w: entry?.defaultSize.w ?? 4,
    h: entry?.defaultSize.h ?? 3,
  };
  return { widgets: [...widgets, widget], id };
}

export function applyImport(
  current: LayoutConfig,
  payload: ImportResult['payload'],
  mode: ImportMode = 'merge',
): LayoutConfig {
  let widgets = [...current.widgets];
  const data: WidgetDataMap = { ...(current.widgetData ?? {}) };

  if (payload['pinned-notes']) {
    const r = ensureWidgetOfType(widgets, 'pinned-notes');
    widgets = r.widgets;
    const existing = (data[r.id] as { notes?: PinnedNote[] } | undefined)?.notes ?? [];
    const base = mode === 'merge' ? existing : [];
    data[r.id] = { notes: [...base, ...payload['pinned-notes'].notes] };
  }

  if (payload.launchpad) {
    const r = ensureWidgetOfType(widgets, 'launchpad');
    widgets = r.widgets;
    const existing =
      (data[r.id] as { categories?: LaunchpadCategory[] } | undefined)?.categories ??
      [];
    const base = mode === 'merge' ? existing : [];
    data[r.id] = {
      categories: [...base, ...payload.launchpad.categories],
    };
  }

  if (payload['quick-tasks']) {
    const r = ensureWidgetOfType(widgets, 'quick-tasks');
    widgets = r.widgets;
    const existing =
      (data[r.id] as { tasks?: Record<string, QuickTask[]> } | undefined)?.tasks ??
      {};
    const base = mode === 'merge' ? existing : {};
    const merged: Record<string, QuickTask[]> = { ...base };
    for (const [date, arr] of Object.entries(payload['quick-tasks'].tasks)) {
      merged[date] = [...(merged[date] ?? []), ...arr];
    }
    data[r.id] = { tasks: merged };
  }

  if (payload.notes) {
    const r = ensureWidgetOfType(widgets, 'notes');
    widgets = r.widgets;
    const existing = (data[r.id] as { notes?: Note[] } | undefined)?.notes ?? [];
    const base = mode === 'merge' ? existing : [];
    data[r.id] = { notes: [...base, ...payload.notes.notes] };
  }

  return {
    ...current,
    widgets,
    widgetData: data,
  };
}

// Export a native backup by pulling each duplicable widget's data back out
// from the instance-keyed widgetData and re-grouping it under type keys,
// so the export stays round-trippable with legacy imports too.
export function exportDashboardFromLayout(layout: LayoutConfig): string {
  const data = layout.widgetData ?? {};

  // Collect first-of-type data for each supported type.
  const pickFirstOfType = <T>(type: string): T | undefined => {
    const w = layout.widgets.find((ww) => ww.type === type);
    return w ? (data[w.i] as T | undefined) : undefined;
  };

  // Merged view — if there are multiple instances (e.g. several pinned-
  // notes widgets), concatenate so no data is lost on export.
  const pinnedAll: PinnedNote[] = [];
  const launchpadAll: LaunchpadCategory[] = [];
  const tasksAll: Record<string, QuickTask[]> = {};
  const notesAll: Note[] = [];
  for (const w of layout.widgets) {
    const slice = data[w.i];
    if (!slice || typeof slice !== 'object') continue;
    if (w.type === 'pinned-notes') {
      const s = slice as { notes?: PinnedNote[] };
      if (Array.isArray(s.notes)) pinnedAll.push(...s.notes);
    } else if (w.type === 'launchpad') {
      const s = slice as { categories?: LaunchpadCategory[] };
      if (Array.isArray(s.categories)) launchpadAll.push(...s.categories);
    } else if (w.type === 'quick-tasks') {
      const s = slice as { tasks?: Record<string, QuickTask[]> };
      if (s.tasks) {
        for (const [d, arr] of Object.entries(s.tasks)) {
          tasksAll[d] = [...(tasksAll[d] ?? []), ...arr];
        }
      }
    } else if (w.type === 'notes') {
      const s = slice as { notes?: Note[] };
      if (Array.isArray(s.notes)) notesAll.push(...s.notes);
    }
  }

  // Also preserve anything keyed at type-level (defensive — shouldn't
  // exist after loadDashboard's migration).
  void pickFirstOfType;

  const payload = {
    __format: 'daily-dashboard/v1',
    __exportedAt: new Date().toISOString(),
    'pinned-notes': pinnedAll.length ? { notes: pinnedAll } : undefined,
    launchpad: launchpadAll.length ? { categories: launchpadAll } : undefined,
    'quick-tasks':
      Object.keys(tasksAll).length > 0 ? { tasks: tasksAll } : undefined,
    notes: notesAll.length ? { notes: notesAll } : undefined,
  };
  return JSON.stringify(payload, null, 2);
}
