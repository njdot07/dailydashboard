import {
  forwardRef,
  useState,
  type ComponentType,
  type HTMLAttributes,
} from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import { WidgetContext } from './WidgetContext';
import { WidgetSettingsModal } from './WidgetSettingsModal';

interface WidgetShellProps extends HTMLAttributes<HTMLDivElement> {
  widgetId: string;
  widgetType: string;
  // Resolved display title — widget.title if the user has renamed this
  // instance, otherwise the registry's default. Caller (Dashboard)
  // computes it.
  title: string;
  Component: ComponentType;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const WidgetShell = forwardRef<HTMLDivElement, WidgetShellProps>(
  function WidgetShell(
    {
      widgetId,
      widgetType,
      title,
      Component,
      className = '',
      style,
      children,
      ...rest
    },
    ref,
  ) {
    const uiMode = useDashboardStore((s) => s.uiMode);
    const removeWidget = useDashboardStore((s) => s.removeWidget);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const showDragHandle = uiMode === 'layout';
    const showEditButtons = uiMode === 'edit';

    return (
      <div
        ref={ref}
        {...rest}
        className={`widget-shell ${className}`.trim()}
        style={style}
        data-widget-type={widgetType}
      >
        {showEditButtons && (
          <div className="widget-shell__tools">
            <button
              type="button"
              className="widget-shell__remove"
              onClick={() => removeWidget(widgetId)}
              aria-label={`Remove ${title}`}
              title="Remove"
            >
              ×
            </button>
            <button
              type="button"
              className="widget-shell__settings"
              onClick={() => setSettingsOpen(true)}
              aria-label={`${title} settings`}
              title="Settings"
            >
              ⚙
            </button>
          </div>
        )}
        {showDragHandle && (
          <span
            className="widget-shell__drag-handle"
            title="Drag to move"
            aria-hidden
          >
            ⠿
          </span>
        )}
        <WidgetContext.Provider value={{ widgetId, widgetType, title }}>
          <div className="widget-shell__body">
            <Component />
          </div>
        </WidgetContext.Provider>
        {children}

        <WidgetSettingsModal
          open={settingsOpen}
          widgetId={widgetId}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    );
  },
);
