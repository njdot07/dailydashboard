import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { useUser } from '../providers/UserProvider';
import { useDashboardStore } from '../stores/dashboardStore';
import { useSecretsStore } from '../stores/secretsStore';
import { useTaskReminders } from '../hooks/useTaskReminders';
import { Header } from './Header';
import { WidgetShell } from './WidgetShell';
import { Settings } from './Settings';
import { getWidgetEntry } from './widgets/registry';
import { resolveThemeUrl, resolveThemeId } from '../lib/theme';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Standard react-grid-layout breakpoints with progressively fewer columns
// so widgets reflow sensibly on narrower screens. Only `lg` is considered
// the canonical, persisted layout — smaller breakpoints auto-derive from it.
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
const GRID_ROW_HEIGHT = 48;
const GRID_MARGIN: [number, number] = [14, 14];

type Breakpoint = keyof typeof BREAKPOINTS;

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
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');

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

  useEffect(() => {
    document.body.setAttribute('data-ui-mode', uiMode);
    return () => {
      document.body.removeAttribute('data-ui-mode');
    };
  }, [uiMode]);

  useEffect(() => {
    document.body.setAttribute('data-breakpoint', breakpoint);
    return () => {
      document.body.removeAttribute('data-breakpoint');
    };
  }, [breakpoint]);

  useTaskReminders();

  // Layout editing is only honest at the canonical lg breakpoint — that's
  // the one we persist. At smaller widths the grid still renders and
  // reflows, but drag/resize is disabled so users don't make changes that
  // silently don't save.
  const editableHere = breakpoint === 'lg';
  const isDraggable = uiMode === 'layout' && editableHere;
  const isResizable = uiMode === 'layout' && editableHere;

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

  // Responsive takes a map of breakpoint → Layout[]. We only supply `lg`;
  // the library derives the rest automatically when it needs them.
  const layouts = useMemo(() => ({ lg: rglLayout }), [rglLayout]);

  const handleLayoutChange = (next: Layout[]) => {
    if (!isDraggable && !isResizable) return;
    if (breakpoint !== 'lg') return;
    updatePositions(next.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })));
  };

  return (
    <div className="app-shell" data-theme={themeId} style={shellStyle}>
      <div className="app-shell__overlay" aria-hidden />
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <main className="app-main">
        {loading && <p className="app-status">Loading your dashboard…</p>}
        {error && <p className="app-status app-status--error">{error}</p>}
        {!editableHere && uiMode === 'layout' && (
          <p className="app-status app-status--hint">
            Layout editing is desktop-only. Resize the window wider to
            rearrange widgets.
          </p>
        )}
        {!loading && !error && (
          <ResponsiveGridLayout
            className="dashboard-grid-rgl"
            layouts={layouts}
            breakpoints={BREAKPOINTS}
            cols={COLS}
            rowHeight={GRID_ROW_HEIGHT}
            margin={GRID_MARGIN}
            isDraggable={isDraggable}
            isResizable={isResizable}
            draggableHandle=".widget-shell__drag-handle"
            compactType="vertical"
            preventCollision={false}
            onLayoutChange={handleLayoutChange}
            onBreakpointChange={(bp) => setBreakpoint(bp as Breakpoint)}
          >
            {widgets.map((w) => {
              const entry = getWidgetEntry(w.type);
              if (!entry) return null;
              return (
                <WidgetShell
                  key={w.i}
                  widgetId={w.i}
                  widgetType={w.type}
                  title={w.title ?? entry.title}
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
