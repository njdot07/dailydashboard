import { useEffect, useState } from 'react';
import { useUser } from '../../providers/UserProvider';
import {
  useDashboardStore,
  selectMergedQuickTasks,
} from '../../stores/dashboardStore';
import { todayKey, minutesSinceMidnight } from '../../lib/date';
import type { QuickTask } from '../../lib/types';

type ToneKey = 'professional' | 'motivational' | 'minimalist' | 'friendly';

interface Template {
  idle: string;
  icon: string;
  next: (task: string, time: string) => string;
}

const TONE_TEMPLATES: Record<ToneKey, Template> = {
  professional: {
    idle: 'No upcoming items. Your schedule is clear.',
    icon: '~',
    next: (t, time) => `Your next task is "${t}" at ${time}.`,
  },
  motivational: {
    idle: "Today is yours — let's make it count.",
    icon: '^',
    next: (t, time) => `Next up: "${t}" at ${time}. You've got this.`,
  },
  minimalist: {
    idle: '— clear —',
    icon: '·',
    next: (t, time) => `${time}  ·  ${t}`,
  },
  friendly: {
    idle: 'Nothing on the schedule — chill vibes only.',
    icon: '*',
    next: (t, time) => `Heads up — "${t}" coming up at ${time}.`,
  },
};

const TONES: ToneKey[] = ['professional', 'motivational', 'minimalist', 'friendly'];

function isToneKey(value: unknown): value is ToneKey {
  return typeof value === 'string' && (TONES as string[]).includes(value);
}

function findNextUpcoming(tasks: QuickTask[]): QuickTask | null {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const candidates = tasks
    .filter((t) => !t.completed && t.time)
    .sort((a, b) => a.time.localeCompare(b.time));
  return candidates.find((t) => minutesSinceMidnight(t.time) >= nowMin) ?? null;
}

export function StatusBar() {
  const { profile, updateProfile } = useUser();
  const editMode = useDashboardStore((s) => s.uiMode === 'edit');
  // Aggregate today's tasks across every QuickTasks widget (users can have
  // multiple now — e.g. "Work tasks" + "Home tasks"). The status bar shows
  // the next upcoming item regardless of which widget it lives in.
  const mergedTasks = useDashboardStore(selectMergedQuickTasks);

  // Re-evaluate "next task" once per minute even if tasks/profile don't change.
  const [minuteTick, setMinuteTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setMinuteTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const tone: ToneKey = isToneKey(profile?.persona_tone)
    ? profile.persona_tone
    : 'professional';
  const tpl = TONE_TEMPLATES[tone];

  const todayTasks = mergedTasks[todayKey()] ?? [];
  // The minuteTick dependency is intentional — referenced here so linters don't
  // strip the interval, which would drop the passive re-evaluation.
  void minuteTick;
  const nextTask = findNextUpcoming(todayTasks);

  const cycleTone = async () => {
    const next = TONES[(TONES.indexOf(tone) + 1) % TONES.length]!;
    await updateProfile({ persona_tone: next });
  };

  return (
    <div className="widget widget--status glass-panel">
      <div className="status-bar-content">
        <span className="status-bar-icon">{tpl.icon}</span>
        <span className="status-bar-text">
          {nextTask ? tpl.next(nextTask.text, nextTask.time) : tpl.idle}
        </span>
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
