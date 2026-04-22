import { useUser } from '../../providers/UserProvider';
import { useDashboardStore } from '../../stores/dashboardStore';

type ToneKey = 'professional' | 'motivational' | 'minimalist' | 'friendly';

interface Template {
  idle: string;
  icon: string;
}

const TONE_TEMPLATES: Record<ToneKey, Template> = {
  professional: {
    idle: 'No upcoming items. Your schedule is clear.',
    icon: '~',
  },
  motivational: {
    idle: "Today is yours — let's make it count.",
    icon: '^',
  },
  minimalist: {
    idle: '— clear —',
    icon: '·',
  },
  friendly: {
    idle: 'Nothing on the schedule — chill vibes only.',
    icon: '*',
  },
};

const TONES: ToneKey[] = ['professional', 'motivational', 'minimalist', 'friendly'];

function isToneKey(value: unknown): value is ToneKey {
  return typeof value === 'string' && (TONES as string[]).includes(value);
}

export function StatusBar() {
  const { profile, updateProfile } = useUser();
  const editMode = useDashboardStore((s) => s.editMode);

  const tone: ToneKey = isToneKey(profile?.persona_tone)
    ? profile.persona_tone
    : 'professional';
  const tpl = TONE_TEMPLATES[tone];

  const cycleTone = async () => {
    const next = TONES[(TONES.indexOf(tone) + 1) % TONES.length]!;
    await updateProfile({ persona_tone: next });
  };

  return (
    <div className="widget widget--status glass-panel">
      <div className="status-bar-content">
        <span className="status-bar-icon">{tpl.icon}</span>
        <span className="status-bar-text">{tpl.idle}</span>
      </div>
      {editMode && (
        <button
          type="button"
          className="tone-cycle-btn"
          onClick={cycleTone}
          title="Cycle persona tone"
        >
          {tone}
        </button>
      )}
    </div>
  );
}
