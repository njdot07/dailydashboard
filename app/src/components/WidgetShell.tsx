import { forwardRef, type ComponentType, type HTMLAttributes } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';

interface WidgetShellProps extends HTMLAttributes<HTMLDivElement> {
  widgetId: string;
  widgetType: string;
  title?: string;
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

    const showDragHandle = uiMode === 'move';
    const showRemoveButton = uiMode === 'edit';

    return (
      <div
        ref={ref}
        {...rest}
        className={`widget-shell ${className}`.trim()}
        style={style}
        data-widget-type={widgetType}
      >
        {showRemoveButton && (
          <button
            type="button"
            className="widget-shell__remove"
            onClick={() => removeWidget(widgetId)}
            aria-label={title ? `Remove ${title}` : 'Remove widget'}
            title="Remove"
          >
            ×
          </button>
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
        <div className="widget-shell__body">
          <Component />
        </div>
        {children}
      </div>
    );
  },
);
