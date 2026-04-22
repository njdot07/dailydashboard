export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function minutesSinceMidnight(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface CalendarCell {
  date: Date;
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

// Builds a 42-cell (6-row) grid for the given month, padded with
// leading/trailing days from neighbouring months. Week starts Sunday.
export function buildMonthCells(cursor: Date): CalendarCell[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const todayStr = todayKey();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({
      date: d,
      key: dateKey(d),
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: dateKey(d) === todayStr,
    });
  }
  return cells;
}

export function formatLongDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d);
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

export function shiftMonth(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(1);
  next.setMonth(d.getMonth() + delta);
  return next;
}
