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

export interface LayoutConfig {
  widgets: WidgetInstance[];
  gridCols?: number;
}

export interface DashboardStateRow {
  id: string;
  user_id: string;
  layout_config: LayoutConfig;
  version: number;
  updated_at: string;
}
