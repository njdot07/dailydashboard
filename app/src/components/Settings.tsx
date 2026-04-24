import { useEffect, useState, type FormEvent } from 'react';
import { useUser } from '../providers/UserProvider';
import { Modal } from './Modal';
import { SecretsSection } from './SecretsSection';
import { DataPortabilitySection } from './DataPortabilitySection';
import { IntegrationsSection } from './IntegrationsSection';
import { DashboardSettingsTab } from './settings/DashboardSettingsTab';
import { PrivacyTab } from './settings/PrivacyTab';
import { HelpTab } from './settings/HelpTab';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

type TabId =
  | 'dashboard'
  | 'integrations'
  | 'vault'
  | 'backup'
  | 'privacy'
  | 'help'
  | 'account';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'vault', label: 'Vault' },
  { id: 'backup', label: 'Backup' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'help', label: 'Help' },
  { id: 'account', label: 'Account' },
];

export function Settings({ open, onClose }: SettingsProps) {
  const [tab, setTab] = useState<TabId>('dashboard');

  // Reset to the Dashboard tab whenever the modal is re-opened so the
  // first thing the user sees is the most common task (widget toggles).
  useEffect(() => {
    if (open) setTab('dashboard');
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="settings settings--tabbed">
        <nav className="settings-tabs" aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`settings-tab${tab === t.id ? ' settings-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="settings-tabpanel">
          {tab === 'dashboard' && <DashboardSettingsTab />}
          {tab === 'integrations' && <IntegrationsSection />}
          {tab === 'vault' && <SecretsSection />}
          {tab === 'backup' && <DataPortabilitySection />}
          {tab === 'privacy' && <PrivacyTab />}
          {tab === 'help' && <HelpTab />}
          {tab === 'account' && <AccountTab onClose={onClose} />}
        </div>
      </div>
    </Modal>
  );
}

// -----------------------------------------------------------------------
// Account tab — kept inline since it's short and only used here.
// -----------------------------------------------------------------------
function AccountTab({ onClose }: { onClose: () => void }) {
  const { profile, user, updateProfile, signOut } = useUser();

  const currentName = profile?.display_name ?? '';
  const [displayName, setDisplayName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(currentName);
  }, [currentName]);

  const dirty = displayName.trim() !== currentName;

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    setSaved(false);
    const { error } = await updateProfile({
      display_name: displayName.trim() || null,
    });
    setSaving(false);
    if (!error) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    }
  };

  return (
    <section className="settings-section">
      <h3 className="settings-section-title">Account</h3>
      <form className="settings-field" onSubmit={saveName}>
        <span>Display name</span>
        <div className="settings-inline-row">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
          <button
            type="submit"
            className="primary-btn small-btn"
            disabled={!dirty || saving}
          >
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </form>

      <div className="settings-field">
        <span>Email</span>
        <span className="settings-readonly">{user?.email}</span>
      </div>

      <div className="settings-field">
        <button
          type="button"
          className="ghost-btn"
          onClick={async () => {
            onClose();
            await signOut();
          }}
        >
          Sign out
        </button>
      </div>
    </section>
  );
}
