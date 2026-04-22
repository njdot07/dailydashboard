import { forwardRef, type ComponentType, type HTMLAttributes } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';

interface WidgetShellProps extends HTMLAttributes<HTMLDivElement> {
  widgetId: string;
  widgetType: string;
  title?: string;
  Component: ComponentType;
  // react-grid-layout injects these via cloneElement.
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

// Forward the ref so react-grid-layout can measure/position the item.
// Props coming from RGL (className, style, children = resize handle) are
// spread onto the outer div alongside our own classes.
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
    const editMode = useDashboardStore((s) => s.editMode);
    const removeWidget = useDashboardStore((s) => s.removeWidget);

    return (
      <div
        ref={ref}
        {...rest}
        className={`widget-shell ${className}`.trim()}
        style={style}
        data-widget-type={widgetType}
      >
        {editMode && (
          <>
            <button
              type="button"
              className="widget-shell__remove"
              onClick={() => removeWidget(widgetId)}
              aria-label={title ? `Remove ${title}` : 'Remove widget'}
              title="Remove"
            >
              ×
            </button>
            <span
              className="widget-shell__drag-handle"
              title="Drag to move"
              aria-hidden
            >
              ⠿
            </span>
          </>
        )}
        <div className="widget-shell__body">
          <Component />
        </div>
        {children}
      </div>
    );
  },
);
