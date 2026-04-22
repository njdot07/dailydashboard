import { createContext, useContext } from 'react';

/**
 * Provides the current widget's grid id and type to children. Every
 * WidgetShell wraps its rendered widget Component in this provider so
 * individual widgets don't have to accept widgetId as a prop — they can
 * call useWidgetContext() when they need to read/write their own settings
 * or layout entry.
 */
export interface WidgetContextValue {
  widgetId: string;
  widgetType: string;
}

export const WidgetContext = createContext<WidgetContextValue | null>(null);

export function useWidgetContext(): WidgetContextValue {
  const ctx = useContext(WidgetContext);
  if (!ctx) {
    throw new Error('useWidgetContext must be used inside a WidgetShell');
  }
  return ctx;
}
