import { useWidgetData } from '../../hooks/useWidgetData';
import { useWidgetSettings } from '../../hooks/useWidgetSettings';
import { useDashboardStore } from '../../stores/dashboardStore';
import type { LaunchpadCategory, LaunchpadLink } from '../../lib/types';

const EMPTY = { categories: [] as LaunchpadCategory[] };

export function Launchpad() {
  const [data, setData] = useWidgetData('launchpad', EMPTY);
  const editMode = useDashboardStore((s) => s.uiMode === 'edit');
  const { settings } = useWidgetSettings();
  const openInNewTab = settings.openInNewTab as boolean;

  const update = (categories: LaunchpadCategory[]) => setData({ categories });

  const addCategory = () => {
    const cat: LaunchpadCategory = {
      id: crypto.randomUUID(),
      name: 'New Category',
      open: true,
      links: [],
    };
    update([...data.categories, cat]);
  };

  const removeCategory = (id: string) => {
    update(data.categories.filter((c) => c.id !== id));
  };

  const updateCategory = (id: string, patch: Partial<LaunchpadCategory>) => {
    update(data.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const addLink = (catId: string) => {
    const link: LaunchpadLink = {
      id: crypto.randomUUID(),
      name: 'New Link',
      url: 'https://',
      icon: '🔗',
    };
    update(
      data.categories.map((c) =>
        c.id === catId ? { ...c, links: [...c.links, link] } : c,
      ),
    );
  };

  const updateLink = (catId: string, linkId: string, patch: Partial<LaunchpadLink>) => {
    update(
      data.categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              links: c.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
            }
          : c,
      ),
    );
  };

  const removeLink = (catId: string, linkId: string) => {
    update(
      data.categories.map((c) =>
        c.id === catId ? { ...c, links: c.links.filter((l) => l.id !== linkId) } : c,
      ),
    );
  };

  return (
    <div className="widget widget--launchpad glass-panel">
      <h2 className="widget-title">Launchpad</h2>

      {data.categories.length === 0 && !editMode && (
        <p className="widget-empty">
          No categories yet. Flip to Edit mode to add some.
        </p>
      )}

      <div className="launchpad-categories">
        {data.categories.map((cat) => (
          <div
            key={cat.id}
            className={`launchpad-category${cat.open ? ' open' : ''}`}
          >
            <div className="launchpad-category-header">
              <button
                type="button"
                className="launchpad-category-toggle"
                onClick={() => updateCategory(cat.id, { open: !cat.open })}
                aria-expanded={cat.open}
                title={cat.open ? 'Collapse' : 'Expand'}
              >
                ▸
              </button>
              {editMode ? (
                <input
                  className="launchpad-category-name"
                  value={cat.name}
                  onChange={(e) =>
                    updateCategory(cat.id, { name: e.target.value })
                  }
                />
              ) : (
                <span className="launchpad-category-name">{cat.name}</span>
              )}
              {editMode && (
                <button
                  type="button"
                  className="item-icon-btn item-icon-btn--delete"
                  onClick={() => removeCategory(cat.id)}
                  aria-label="Delete category"
                  title="Delete category"
                >
                  ×
                </button>
              )}
            </div>

            {cat.open && (
              <div className="launchpad-category-body">
                {cat.links.length === 0 && !editMode && (
                  <p className="widget-empty">No links.</p>
                )}
                {cat.links.map((link) =>
                  editMode ? (
                    <div key={link.id} className="launchpad-link-edit">
                      <input
                        className="lp-edit-icon"
                        value={link.icon}
                        onChange={(e) =>
                          updateLink(cat.id, link.id, { icon: e.target.value })
                        }
                        maxLength={4}
                        placeholder="Icon"
                      />
                      <input
                        className="lp-edit-name"
                        value={link.name}
                        onChange={(e) =>
                          updateLink(cat.id, link.id, { name: e.target.value })
                        }
                        placeholder="Name"
                      />
                      <input
                        className="lp-edit-url"
                        value={link.url}
                        onChange={(e) =>
                          updateLink(cat.id, link.id, { url: e.target.value })
                        }
                        placeholder="URL"
                      />
                      <button
                        type="button"
                        className="item-icon-btn item-icon-btn--delete"
                        onClick={() => removeLink(cat.id, link.id)}
                        aria-label="Delete link"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <a
                      key={link.id}
                      href={link.url}
                      target={openInNewTab ? '_blank' : undefined}
                      rel={openInNewTab ? 'noreferrer noopener' : undefined}
                      className="launchpad-link"
                    >
                      <span className="lp-icon">{link.icon}</span>
                      <span className="lp-name">{link.name}</span>
                    </a>
                  ),
                )}
                {editMode && (
                  <button
                    type="button"
                    className="lp-add-link-btn"
                    onClick={() => addLink(cat.id)}
                  >
                    + Add link
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {editMode && (
        <button type="button" className="lp-add-category-btn" onClick={addCategory}>
          + Add category
        </button>
      )}
    </div>
  );
}
