import type { ComponentType } from 'react';
import { Quote } from './Quote';
import { Clock } from './Clock';
import { StatusBar } from './StatusBar';
import { QuickTasks } from './QuickTasks';
import { Calendar } from './Calendar';
import { PinnedNotes } from './PinnedNotes';
import { Launchpad } from './Launchpad';
import { NotesLibrary } from './NotesLibrary';

export interface WidgetEntry {
  type: string;
  title: string;
  Component: ComponentType;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  // If true, only one instance of this widget type can exist at a time.
  // Widgets that render user data (pinned-notes, launchpad) could theoretically
  // be duplicated; most widgets don't make sense duplicated.
  singleton?: boolean;
}

// Ordered for palette display — most commonly added widgets first.
export const WIDGET_REGISTRY: Record<string, WidgetEntry> = {
  quote: {
    type: 'quote',
    title: 'Quote',
    Component: Quote,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 4, h: 2 },
    singleton: true,
  },
  'status-bar': {
    type: 'status-bar',
    title: 'Status Bar',
    Component: StatusBar,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 4, h: 2 },
    singleton: true,
  },
  clock: {
    type: 'clock',
    title: 'Clock',
    Component: Clock,
    defaultSize: { w: 3, h: 4 },
    minSize: { w: 3, h: 4 },
    singleton: true,
  },
  'quick-tasks': {
    type: 'quick-tasks',
    title: 'Today',
    Component: QuickTasks,
    defaultSize: { w: 3, h: 4 },
    minSize: { w: 3, h: 3 },
    singleton: true,
  },
  calendar: {
    type: 'calendar',
    title: 'Calendar',
    Component: Calendar,
    defaultSize: { w: 6, h: 6 },
    minSize: { w: 4, h: 5 },
    singleton: true,
  },
  'pinned-notes': {
    type: 'pinned-notes',
    title: 'Pinned Notes',
    Component: PinnedNotes,
    defaultSize: { w: 3, h: 4 },
    minSize: { w: 3, h: 3 },
    singleton: true,
  },
  launchpad: {
    type: 'launchpad',
    title: 'Launchpad',
    Component: Launchpad,
    defaultSize: { w: 3, h: 5 },
    minSize: { w: 3, h: 3 },
    singleton: true,
  },
  notes: {
    type: 'notes',
    title: 'Notes',
    Component: NotesLibrary,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    singleton: true,
  },
};

export function getWidgetEntry(type: string): WidgetEntry | undefined {
  return WIDGET_REGISTRY[type];
}
