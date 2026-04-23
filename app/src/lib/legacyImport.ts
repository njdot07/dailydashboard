// Legacy → new import adapter.
//
// The old dashboard kept everything in one blob under
// localStorage['fs_user_data']. Shape (trimmed to fields we care about):
//
//   {
//     settings: {
//       launchpadCategories: [
//         { id, name, open, links: [{ name, url, icon }] }
//       ]
//     },
//     pinnedNotes: [{ id, text }],
//     [YYYY-MM-DD]: {
//       tasks: [{ id, text, time, timeEnd, duration, color, completed }],
//       thoughtSpaces: [
//         { id, title, sections: [
//           { id, title, type, items: [{ id, text }] }
//         ]}
//       ]
//     },
//     ...
//   }
//
// This module maps that blob into three slices of our new WidgetDataShape
// and returns a preview + normalised payload the UI can apply.

import type {
  LaunchpadCategory,
  LaunchpadLink,
  Note,
  PinnedNote,
  QuickTask,
  WidgetDataShape,
} from './types';

export interface LegacyPreview {
  pinnedNotes: number;
  launchpadCategories: number;
  launchpadLinks: number;
  taskDates: number;
  tasksTotal: number;
  notesFromThoughts: number;
}

export interface LegacyImportResult {
  preview: LegacyPreview;
  payload: {
    'pinned-notes'?: { notes: PinnedNote[] };
    launchpad?: { categories: LaunchpadCategory[] };
    'quick-tasks'?: { tasks: Record<string, QuickTask[]> };
    notes?: { notes: Note[] };
  };
}

function randomId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseDurationLike(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return Math.max(0, Math.floor(value));
  }
  // Legacy stored "30min", "1h", "45m" etc.
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
      const id =
        typeof (raw as { id?: unknown }).id === 'string'
          ? (raw as { id: string }).id
          : randomId();
      return { id, text, createdAt: now };
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
      const name = typeof c.name === 'string' ? c.name : 'Untitled';
      const id = typeof c.id === 'string' ? c.id : randomId();
      const open = typeof c.open === 'boolean' ? c.open : false;
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
      return { id, name, open, links };
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

function mapThoughtsToNotes(blob: Record<string, unknown>): Note[] {
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
                it && typeof it === 'object' &&
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

export function parseLegacyExport(json: string): LegacyImportResult {
  const trimmed = json.trim();
  if (!trimmed) {
    throw new Error('Paste your exported JSON first.');
  }
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch (e) {
    throw new Error('That does not look like valid JSON.');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Expected an object at the top level.');
  }
  const blob = data as Record<string, unknown>;

  // Pinned notes
  const pinned = mapPinnedNotes(blob.pinnedNotes);

  // Launchpad (under settings.launchpadCategories in the legacy shape)
  const settingsRaw = blob.settings;
  const settings =
    settingsRaw && typeof settingsRaw === 'object'
      ? (settingsRaw as Record<string, unknown>)
      : {};
  const launchpad = mapLaunchpad(settings.launchpadCategories);

  // Tasks, grouped by date key
  const tasksByDate: Record<string, QuickTask[]> = {};
  let tasksTotal = 0;
  for (const [key, dayRaw] of Object.entries(blob)) {
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

  // Thought spaces → notes (best-effort flatten)
  const notes = mapThoughtsToNotes(blob);

  const payload: LegacyImportResult['payload'] = {};
  if (pinned.length) payload['pinned-notes'] = { notes: pinned };
  if (launchpad.length) payload.launchpad = { categories: launchpad };
  if (Object.keys(tasksByDate).length) {
    payload['quick-tasks'] = { tasks: tasksByDate };
  }
  if (notes.length) payload.notes = { notes };

  const preview: LegacyPreview = {
    pinnedNotes: pinned.length,
    launchpadCategories: launchpad.length,
    launchpadLinks: launchpad.reduce((n, c) => n + c.links.length, 0),
    taskDates: Object.keys(tasksByDate).length,
    tasksTotal,
    notesFromThoughts: notes.length,
  };

  return { preview, payload };
}

// Merge an imported payload into existing widgetData. Merging appends items
// (duplicates possible — caller is expected to show a preview + get explicit
// confirmation). Replace mode simply overwrites the matching slices.
export function applyImport(
  current: WidgetDataShape,
  payload: LegacyImportResult['payload'],
  mode: 'merge' | 'replace' = 'merge',
): WidgetDataShape {
  const next: WidgetDataShape = { ...current };

  if (payload['pinned-notes']) {
    const base = mode === 'merge' ? (current['pinned-notes']?.notes ?? []) : [];
    next['pinned-notes'] = {
      notes: [...base, ...payload['pinned-notes'].notes],
    };
  }

  if (payload.launchpad) {
    const base = mode === 'merge' ? (current.launchpad?.categories ?? []) : [];
    next.launchpad = {
      categories: [...base, ...payload.launchpad.categories],
    };
  }

  if (payload['quick-tasks']) {
    const base =
      mode === 'merge' ? (current['quick-tasks']?.tasks ?? {}) : {};
    const merged: Record<string, QuickTask[]> = { ...base };
    for (const [date, arr] of Object.entries(payload['quick-tasks'].tasks)) {
      merged[date] = [...(merged[date] ?? []), ...arr];
    }
    next['quick-tasks'] = { tasks: merged };
  }

  if (payload.notes) {
    const base = mode === 'merge' ? (current.notes?.notes ?? []) : [];
    next.notes = { notes: [...base, ...payload.notes.notes] };
  }

  return next;
}
