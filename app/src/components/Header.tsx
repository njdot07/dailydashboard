import { useUser } from '../providers/UserProvider';
import {
  useDashboardStore,
  UI_MODES,
  type UIMode,
} from '../stores/dashboardStore';

const MODE_LABELS: Record<UIMode, string> = {
  view: 'View',
  layout: 'Layout',
  edit: 'Edit',
};

const MODE_HINTS: Record<UIMode, string> = {
  view: 'Read-only — interact with widget content',
  layout: 'Drag and resize widgets to rearrange',
  edit: 'Edit widget contents and remove widgets',
};

interface HeaderProps {
  onOpenSettings?: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  const { profile, user } = useUser();
  const uiMode = useDashboardStore((s) => s.uiMode);
  const setUIMode = useDashboardStore((s) => s.setUIMode);
  const saving = useDashboardStore((s) => s.saving);

  const label = profile?.display_name ?? user?.email ?? 'You';

  return (
    <header className="app-header">
      <div className="app-header__left">
        <div className="app-header__brand">Daily Dashboard</div>
        <div className="mode-group" role="tablist" aria-label="Dashboard mode">
          {UI_MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={uiMode === m}
              className={`mode-btn${uiMode === m ? ' mode-btn--active' : ''}`}
              onClick={() => setUIMode(m)}
              title={MODE_HINTS[m]}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="app-header__actions">
        {saving && <span className="app-header__saving">Saving…</span>}
        <span className="app-header__user">Hi, {label}</span>
        {onOpenSettings && (
          <button
            type="button"
            className="ghost-btn"
            onClick={onOpenSettings}
            aria-label="Open settings"
          >
            Settings
          </button>
        )}
      </div>
    </header>
  );
}
