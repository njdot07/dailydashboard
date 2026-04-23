import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';
import { useUser } from '../providers/UserProvider';
import { useDashboardStore } from '../stores/dashboardStore';
import { useSecretsStore } from '../stores/secretsStore';
import { useTaskReminders } from '../hooks/useTaskReminders';
import { Header } from './Header';
import { WidgetShell } from './WidgetShell';
import { Settings } from './Settings';
import { getWidgetEntry } from './widgets/registry';
import { resolveThemeUrl, resolveThemeId } from '../lib/theme';

const ResponsiveGridLayout = WidthProvider(GridLayout);

const GRID_COLS = 12;
const GRID_ROW_HEIGHT = 48;
const GRID_MARGIN: [number, number] = [14, 14];

export function Dashboard() {
  const { user, profile } = useUser();
  const loadDashboard = useDashboardStore((s) => s.loadDashboard);
  const reset = useDashboardStore((s) => s.reset);
  const loading = useDashboardStore((s) => s.loading);
  const error = useDashboardStore((s) => s.error);
  const uiMode = useDashboardStore((s) => s.uiMode);
  const widgets = useDashboardStore((s) => s.layout.widgets);
  const updatePositions = useDashboardStore((s) => s.updatePositions);

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Resolve the user's picked background. Image-based themes (marble, pastel,
  // metallic, custom URLs) set --bg-url which the default .app-shell rule
  // consumes. CSS-driven themes (brown) return null and rely on the
  // data-theme attribute for their styling.
  const backgroundUrl = resolveThemeUrl(profile?.theme_preference);
  const themeId = resolveThemeId(profile?.theme_preference);
  const shellStyle = backgroundUrl
    ? ({ '--bg-url': `url("${backgroundUrl}")` } as CSSProperties)
    : undefined;

  useEffect(() => {
    if (!user) return;
    loadDashboard(user.id);
    return () => {
      reset();
    };
  }, [user?.id, loadDashboard, reset]);

  // Secrets vault lifecycle — bind to user and auto-lock on page unload.
  useEffect(() => {
    if (!user) {
      useSecretsStore.getState().reset();
      return;
    }
    useSecretsStore.getState().initialize(user.id);
    const onBeforeUnload = () => useSecretsStore.getState().lock();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      useSecretsStore.getState().reset();
    };
  }, [user?.id]);

  // Drive a single body attribute so CSS can key mode-specific visuals
  // (drag-handle visibility, scrollbar hide, content click-lock) off of it.
  useEffect(() => {
    document.body.setAttribute('data-ui-mode', uiMode);
    return () => {
      document.body.removeAttribute('data-ui-mode');
    };
  }, [uiMode]);

  useTaskReminders();

  const isDraggable = uiMode === 'layout';
  const isResizable = uiMode === 'layout';

  const rglLayout: Layout[] = useMemo(
    () =>
      widgets.map((w) => {
        const entry = getWidgetEntry(w.type);
        return {
          i: w.i,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          minW: entry?.minSize?.w,
          minH: entry?.minSize?.h,
          static: !isDraggable && !isResizable,
        };
      }),
    [widgets, isDraggable, isResizable],
  );

  const handleLayoutChange = (next: Layout[]) => {
    if (!isDraggable && !isResizable) return;
    updatePositions(
      next.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })),
    );
  };

  return (
    <div className="app-shell" data-theme={themeId} style={shellStyle}>
      <div className="app-shell__overlay" aria-hidden />
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <main className="app-main">
        {loading && <p className="app-status">Loading your dashboard…</p>}
        {error && <p className="app-status app-status--error">{error}</p>}
        {!loading && !error && (
          <ResponsiveGridLayout
            className="dashboard-grid-rgl"
            layout={rglLayout}
            cols={GRID_COLS}
            rowHeight={GRID_ROW_HEIGHT}
            margin={GRID_MARGIN}
            isDraggable={isDraggable}
            isResizable={isResizable}
            draggableHandle=".widget-shell__drag-handle"
            compactType="vertical"
            preventCollision={false}
            onLayoutChange={handleLayoutChange}
          >
            {widgets.map((w) => {
              const entry = getWidgetEntry(w.type);
              if (!entry) return null;
              return (
                <WidgetShell
                  key={w.i}
                  widgetId={w.i}
                  widgetType={w.type}
                  title={entry.title}
                  Component={entry.Component}
                />
              );
            })}
          </ResponsiveGridLayout>
        )}
      </main>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
