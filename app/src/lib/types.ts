export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  persona_tone: string;
  theme_preference: string;
  created_at: string;
  updated_at: string;
}

export interface WidgetInstance {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  // Per-instance settings blob — shape is determined by the widget's
  // registry.settingsSchema.
  settings?: Record<string, unknown>;
  // User-editable label. Falls back to the registry's default title when
  // absent (e.g. "Pinned Notes"). Useful when duplicating a widget so the
  // instances can be told apart ("Work" / "Personal").
  title?: string;
}

export interface PinnedNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface LaunchpadLink {
  id: string;
  name: string;
  url: string;
  icon: string;
}

export interface LaunchpadCategory {
  id: string;
  name: string;
  open: boolean;
  links: LaunchpadLink[];
}

export interface QuickTask {
  id: string;
  text: string;
  time: string;
  duration: number;
  completed: boolean;
  color?: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

// Widget content is keyed by widget INSTANCE id (layout.widgets[i].i), not
// by type — so duplicated widgets of the same type have their own slots.
// Values are type-erased at the edge of the store; individual widgets cast
// to their own shape via useWidgetData<T>().
export type WidgetDataMap = Record<string, unknown>;

// Kept for reference / documentation — not a runtime constraint anymore.
// Gives an at-a-glance map of which widget type produces which data shape.
export interface KnownWidgetData {
  'pinned-notes': { notes: PinnedNote[] };
  launchpad: { categories: LaunchpadCategory[] };
  'quick-tasks': { tasks: Record<string, QuickTask[]> };
  notes: { notes: Note[] };
}

export interface LayoutConfig {
  widgets: WidgetInstance[];
  widgetData?: WidgetDataMap;
  gridCols?: number;
}

export interface DashboardStateRow {
  id: string;
  user_id: string;
  layout_config: LayoutConfig;
  version: number;
  updated_at: string;
}
