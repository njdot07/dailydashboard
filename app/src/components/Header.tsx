import { useUser } from '../providers/UserProvider';
import { useDashboardStore } from '../stores/dashboardStore';

export function Header() {
  const { profile, user, signOut } = useUser();
  const editMode = useDashboardStore((s) => s.editMode);
  const toggleEditMode = useDashboardStore((s) => s.toggleEditMode);
  const saving = useDashboardStore((s) => s.saving);

  const label = profile?.display_name ?? user?.email ?? 'You';

  return (
    <header className="app-header">
      <div className="app-header__brand">Daily Dashboard</div>

      <div className="app-header__actions">
        {saving && <span className="app-header__saving">Saving…</span>}
        <span className="app-header__user">Hi, {label}</span>

        <button
          type="button"
          className={`mode-toggle mode-toggle--${editMode ? 'edit' : 'view'}`}
          onClick={toggleEditMode}
          aria-pressed={editMode}
          title={editMode ? 'Exit edit mode' : 'Enter edit mode'}
        >
          {editMode ? 'Edit mode' : 'View mode'}
        </button>

        <button type="button" className="signout" onClick={signOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
