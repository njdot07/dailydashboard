import { useEffect, useMemo, useState } from 'react';
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';
import { useUser } from '../providers/UserProvider';
import { useDashboardStore } from '../stores/dashboardStore';
import { useTaskReminders } from '../hooks/useTaskReminders';
import { Header } from './Header';
import { WidgetShell } from './WidgetShell';
import { WidgetPalette } from './WidgetPalette';
import { getWidgetEntry } from './widgets/registry';

const ResponsiveGridLayout = WidthProvider(GridLayout);

const GRID_COLS = 12;
const GRID_ROW_HEIGHT = 60;
const GRID_MARGIN: [number, number] = [16, 16];

export function Dashboard() {
  const { user } = useUser();
  const loadDashboard = useDashboardStore((s) => s.loadDashboard);
  const reset = useDashboardStore((s) => s.reset);
  const loading = useDashboardStore((s) => s.loading);
  const error = useDashboardStore((s) => s.error);
  const editMode = useDashboardStore((s) => s.editMode);
  const widgets = useDashboardStore((s) => s.layout.widgets);
  const updatePositions = useDashboardStore((s) => s.updatePositions);

  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadDashboard(user.id);
    return () => {
      reset();
    };
  }, [user?.id, loadDashboard, reset]);

  useEffect(() => {
    document.body.classList.toggle('edit-mode', editMode);
    return () => {
      document.body.classList.remove('edit-mode');
    };
  }, [editMode]);

  useTaskReminders();

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
          static: !editMode,
        };
      }),
    [widgets, editMode],
  );

  const handleLayoutChange = (next: Layout[]) => {
    updatePositions(
      next.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })),
    );
  };

  return (
    <div className="app-shell">
      <div className="app-shell__overlay" aria-hidden />
      <Header onOpenPalette={() => setPaletteOpen(true)} />
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
            isDraggable={editMode}
            isResizable={editMode}
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
      <WidgetPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
