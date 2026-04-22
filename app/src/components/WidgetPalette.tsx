import { useDashboardStore } from '../stores/dashboardStore';
import { WIDGET_REGISTRY } from './widgets/registry';
import { Modal } from './Modal';

interface WidgetPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function WidgetPalette({ open, onClose }: WidgetPaletteProps) {
  const addWidget = useDashboardStore((s) => s.addWidget);
  const widgets = useDashboardStore((s) => s.layout.widgets);
  const currentTypes = new Set(widgets.map((w) => w.type));

  const handleAdd = (type: string) => {
    addWidget(type);
    onClose();
  };

  const entries = Object.values(WIDGET_REGISTRY);

  return (
    <Modal open={open} onClose={onClose} title="Add a widget">
      <div className="widget-palette">
        {entries.map((entry) => {
          const alreadyAdded = entry.singleton && currentTypes.has(entry.type);
          return (
            <button
              key={entry.type}
              type="button"
              className="widget-palette-item"
              onClick={() => handleAdd(entry.type)}
              disabled={alreadyAdded}
              title={
                alreadyAdded
                  ? `Already on your dashboard`
                  : `Add ${entry.title}`
              }
            >
              <span className="widget-palette-title">{entry.title}</span>
              <span className="widget-palette-size">
                {entry.defaultSize.w}×{entry.defaultSize.h}
              </span>
              {alreadyAdded && (
                <span className="widget-palette-added">Already added</span>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
