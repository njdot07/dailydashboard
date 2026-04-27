import { createContext, useContext } from 'react';

/**
 * Provides the current widget instance's id, type, and resolved display
 * title to children. Every WidgetShell wraps its rendered widget Component
 * in this provider so individual widgets don't have to accept widgetId as
 * a prop — they can call useWidgetContext() when they need to read/write
 * their own settings or data.
 */
export interface WidgetContextValue {
  widgetId: string;
  widgetType: string;
  // widget.title if the user has renamed this instance, otherwise the
  // default title from the widget's registry entry.
  title: string;
}

export const WidgetContext = createContext<WidgetContextValue | null>(null);

export function useWidgetContext(): WidgetContextValue {
  const ctx = useContext(WidgetContext);
  if (!ctx) {
    throw new Error('useWidgetContext must be used inside a WidgetShell');
  }
  return ctx;
}
