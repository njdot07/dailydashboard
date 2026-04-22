import type { WidgetInstance } from './types';

// Seeded once for new users and for existing users whose layout_config.widgets
// is empty. Values land on a 12-column grid with rowHeight=60. Positions chosen
// so everything is visible on a standard laptop screen without scrolling.
export const DEFAULT_WIDGETS: WidgetInstance[] = [
  { i: 'quote-1', type: 'quote', x: 0, y: 0, w: 12, h: 1 },
  { i: 'status-bar-1', type: 'status-bar', x: 0, y: 1, w: 12, h: 1 },
  { i: 'clock-1', type: 'clock', x: 0, y: 2, w: 3, h: 4 },
  { i: 'quick-tasks-1', type: 'quick-tasks', x: 3, y: 2, w: 3, h: 4 },
  { i: 'calendar-1', type: 'calendar', x: 6, y: 2, w: 6, h: 6 },
  { i: 'pinned-notes-1', type: 'pinned-notes', x: 0, y: 6, w: 3, h: 4 },
  { i: 'launchpad-1', type: 'launchpad', x: 3, y: 6, w: 3, h: 4 },
  { i: 'notes-1', type: 'notes', x: 6, y: 8, w: 6, h: 4 },
];
