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
  settings?: Record<string, unknown>;
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

// Widget content is keyed by widget type inside layout_config.widgetData.
// Positions live in layout_config.widgets (populated when react-grid-layout
// lands in PR 4).
export interface WidgetDataShape {
  'pinned-notes'?: { notes: PinnedNote[] };
  'launchpad'?: { categories: LaunchpadCategory[] };
  'quick-tasks'?: { tasks: Record<string, QuickTask[]> };
  'notes'?: { notes: Note[] };
}

export interface LayoutConfig {
  widgets: WidgetInstance[];
  widgetData?: WidgetDataShape;
  gridCols?: number;
}

export interface DashboardStateRow {
  id: string;
  user_id: string;
  layout_config: LayoutConfig;
  version: number;
  updated_at: string;
}
