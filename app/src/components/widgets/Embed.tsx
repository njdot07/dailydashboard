import { useEffect, useState, type FormEvent } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { useWidgetContext } from '../WidgetContext';
import { useDashboardStore } from '../../stores/dashboardStore';

interface EmbedData {
  url: string;
}

const EMPTY: EmbedData = { url: '' };

/**
 * Convert common share URLs and pasted `<iframe>` snippets into a URL the
 * browser can actually embed. Returns the trimmed input unchanged when it
 * doesn't match a known pattern (most services already expose an /embed/
 * URL that works directly).
 */
function normalizeEmbedUrl(input: string): string {
  const s = input.trim();
  if (!s) return '';

  // Pasted <iframe src="…"> snippet — pull the src out.
  const iframe = s.match(/<iframe[^>]+src\s*=\s*["']([^"']+)["']/i);
  if (iframe?.[1]) return iframe[1];

  // YouTube watch URL → /embed/
  const ytWatch = s.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*?v=([A-Za-z0-9_-]{6,})/,
  );
  if (ytWatch?.[1]) return `https://www.youtube.com/embed/${ytWatch[1]}`;

  // youtu.be short link → /embed/
  const ytShort = s.match(
    /(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]{6,})/,
  );
  if (ytShort?.[1]) return `https://www.youtube.com/embed/${ytShort[1]}`;

  // Spotify share link → /embed/ (skip if already /embed/).
  const spotify = s.match(
    /(?:https?:\/\/)?open\.spotify\.com\/(track|playlist|album|artist|episode|show)\/([A-Za-z0-9]+)/,
  );
  if (spotify && !s.includes('/embed/')) {
    return `https://open.spotify.com/embed/${spotify[1]}/${spotify[2]}`;
  }

  return s;
}

export function Embed() {
  const [data, setData] = useWidgetData(EMPTY);
  const { title } = useWidgetContext();
  const editMode = useDashboardStore((s) => s.uiMode === 'edit');

  // Local draft so typing doesn't re-render the iframe on every keystroke.
  const [draft, setDraft] = useState(data.url);
  useEffect(() => {
    setDraft(data.url);
  }, [data.url]);

  const apply = (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizeEmbedUrl(draft);
    if (normalized !== data.url) setData({ url: normalized });
  };

  const clear = () => {
    setData({ url: '' });
    setDraft('');
  };

  // --- Empty state ---
  if (!data.url) {
    return (
      <div className="widget widget--embed widget--embed-empty glass-panel">
        <h2 className="widget-title">{title}</h2>
        <p className="widget-empty">
          Paste a URL to embed. Works with Google Calendar, YouTube,
          Spotify, Twitter, maps, most RSS readers. Sites like Gmail,
          Teams, and WhatsApp block embedding for security.
        </p>
        <form className="embed-empty-form" onSubmit={apply}>
          <input
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
          <button
            type="submit"
            className="primary-btn small-btn"
            disabled={!draft.trim()}
          >
            Load
          </button>
        </form>
      </div>
    );
  }

  // --- Loaded state ---
  return (
    <div className="widget widget--embed glass-panel">
      {editMode && (
        <form className="embed-toolbar" onSubmit={apply}>
          <input
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Embed URL"
          />
          <button
            type="submit"
            className="ghost-btn small-btn"
            disabled={!draft.trim() || draft.trim() === data.url}
          >
            Update
          </button>
          <button
            type="button"
            className="ghost-btn small-btn"
            onClick={clear}
          >
            Clear
          </button>
        </form>
      )}
      <iframe
        key={data.url}
        src={data.url}
        title={title}
        className="embed-iframe"
        loading="lazy"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {/* Always-visible escape hatch. If the site blocks framing, the
          iframe goes blank/broken; clicking this opens the real URL. */}
      <a
        href={data.url}
        target="_blank"
        rel="noreferrer noopener"
        className="embed-open-external"
        title="Open in new tab"
        aria-label="Open embedded page in a new tab"
      >
        ↗
      </a>
    </div>
  );
}
