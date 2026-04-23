import type { ComponentType } from 'react';
import { Quote } from './Quote';
import { Clock } from './Clock';
import { StatusBar } from './StatusBar';
import { QuickTasks } from './QuickTasks';
import { Calendar } from './Calendar';
import { PinnedNotes } from './PinnedNotes';
import { Launchpad } from './Launchpad';
import { NotesLibrary } from './NotesLibrary';
import type { SettingsSchema } from '../../lib/widgetSettings';

export interface WidgetEntry {
  type: string;
  title: string;
  Component: ComponentType;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  singleton?: boolean;
  settingsSchema?: SettingsSchema;
}

export const WIDGET_REGISTRY: Record<string, WidgetEntry> = {
  quote: {
    type: 'quote',
    title: 'Quote',
    Component: Quote,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 3, h: 2 },
    singleton: true,
    settingsSchema: {
      autoRefreshSeconds: {
        type: 'number',
        label: 'Auto-refresh every (seconds)',
        default: 0,
        min: 0,
        max: 3600,
        step: 10,
        hint: '0 disables auto-refresh. Click the ↻ button to change manually.',
      },
    },
  },
  'status-bar': {
    type: 'status-bar',
    title: 'Status Bar',
    Component: StatusBar,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 3, h: 2 },
    singleton: true,
  },
  clock: {
    type: 'clock',
    title: 'Clock',
    Component: Clock,
    defaultSize: { w: 3, h: 5 },
    // Clock is now SVG-based and scales to its container, so it can go small.
    minSize: { w: 2, h: 2 },
    singleton: true,
  },
  'quick-tasks': {
    type: 'quick-tasks',
    title: 'Today',
    Component: QuickTasks,
    defaultSize: { w: 3, h: 4 },
    minSize: { w: 2, h: 3 },
    // Duplicatable — users can have several task boards (e.g. "Work",
    // "Personal"). StatusBar + Calendar merge tasks across all instances.
    singleton: false,
    settingsSchema: {
      defaultDuration: {
        type: 'number',
        label: 'Default task duration (min)',
        default: 30,
        min: 0,
        max: 600,
        step: 5,
        hint: 'Prefilled when you add a new task.',
      },
      hideCompleted: {
        type: 'boolean',
        label: 'Hide completed tasks',
        default: false,
        hint: 'Tick to keep the list focused on what is still to do.',
      },
    },
  },
  calendar: {
    type: 'calendar',
    title: 'Calendar',
    Component: Calendar,
    defaultSize: { w: 6, h: 6 },
    // Calendar needs at least 4 cols to keep the 7-day weekday row legible.
    minSize: { w: 4, h: 4 },
    singleton: true,
    settingsSchema: {
      weekStartsOn: {
        type: 'select',
        label: 'Week starts on',
        default: 'sun',
        options: [
          { value: 'sun', label: 'Sunday' },
          { value: 'mon', label: 'Monday' },
        ],
      },
      showTaskBadges: {
        type: 'boolean',
        label: 'Show task count on each day',
        default: true,
      },
    },
  },
  'pinned-notes': {
    type: 'pinned-notes',
    title: 'Pinned Notes',
    Component: PinnedNotes,
    defaultSize: { w: 3, h: 4 },
    minSize: { w: 2, h: 2 },
    // Duplicatable — users can have several boards (e.g. "Work", "Personal")
    // and rename each via the settings gear.
    singleton: false,
  },
  launchpad: {
    type: 'launchpad',
    title: 'Launchpad',
    Component: Launchpad,
    defaultSize: { w: 3, h: 5 },
    minSize: { w: 2, h: 2 },
    singleton: false,
    settingsSchema: {
      openInNewTab: {
        type: 'boolean',
        label: 'Open links in a new tab',
        default: true,
      },
    },
  },
  notes: {
    type: 'notes',
    title: 'Notes',
    Component: NotesLibrary,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 2, h: 2 },
    singleton: false,
  },
};

export function getWidgetEntry(type: string): WidgetEntry | undefined {
  return WIDGET_REGISTRY[type];
}
