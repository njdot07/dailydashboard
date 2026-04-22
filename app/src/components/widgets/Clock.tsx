import { useEffect, useMemo, useRef } from 'react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { addMinutes, todayKey } from '../../lib/date';
import { TASK_COLORS } from './QuickTasks';
import type { QuickTask } from '../../lib/types';

interface MarkerData {
  hour: number;
  isMajor: boolean;
  rotation: number;
  numberStyle?: { left: number; top: number };
  label?: string;
}

function buildMarkers(): MarkerData[] {
  const markers: MarkerData[] = [];
  for (let i = 0; i < 12; i++) {
    const isMajor = i % 3 === 0;
    const marker: MarkerData = { hour: i, isMajor, rotation: i * 30 };
    if (isMajor) {
      const angleRad = (i * 30 - 90) * (Math.PI / 180);
      const r = 90;
      const x = 125 + r * Math.cos(angleRad);
      const y = 125 + r * Math.sin(angleRad);
      marker.numberStyle = { left: x, top: y - 12 };
      marker.label = i === 0 ? '12' : String(i);
    }
    markers.push(marker);
  }
  return markers;
}

// Convert HH:MM to degrees on a 12-hour dial (0 = 12 o'clock, increases clockwise)
function timeToDeg(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (((h ?? 0) % 12) + (m ?? 0) / 60) * 30;
}

function polar(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return [r * Math.cos(rad), r * Math.sin(rad)];
}

// SVG arc path in unit-circle coords (-1 to 1). radius is 0..1.
function arcPath(startDeg: number, endDeg: number, radius: number): string {
  let span = (endDeg - startDeg + 360) % 360;
  if (span === 0) span = 360;
  const largeArc = span > 180 ? 1 : 0;
  const [sx, sy] = polar(startDeg, radius);
  const [ex, ey] = polar(endDeg, radius);
  return `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArc} 1 ${ex} ${ey}`;
}

interface TaskVisual {
  id: string;
  color: string;
  completed: boolean;
  startDeg: number;
  startX: number;
  startY: number;
  arcPath: string | null;
}

function buildTaskVisuals(tasks: QuickTask[], radius: number): TaskVisual[] {
  return tasks
    .filter((t) => t.time)
    .map((t) => {
      const color = t.color ?? TASK_COLORS[0]!;
      const startDeg = timeToDeg(t.time);
      const [startX, startY] = polar(startDeg, radius);
      const path =
        t.duration > 0
          ? arcPath(startDeg, timeToDeg(addMinutes(t.time, t.duration)), radius)
          : null;
      return {
        id: t.id,
        color,
        completed: t.completed,
        startDeg,
        startX,
        startY,
        arcPath: path,
      };
    });
}

export function Clock() {
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);
  const secRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  const markers = useMemo(buildMarkers, []);

  // Read today's tasks reactively — if the user adds/edits tasks, arcs update.
  const tasksData = useDashboardStore(
    (s) => s.layout.widgetData?.['quick-tasks'],
  );
  const todayTasks = tasksData?.tasks[todayKey()] ?? [];
  const taskVisuals = useMemo(
    () => buildTaskVisuals(todayTasks, 0.86),
    [todayTasks],
  );

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();

      const hourDeg = ((h % 12) + m / 60) * 30;
      const minuteDeg = m * 6 + s * 0.1;
      const secondDeg = s * 6;

      if (hourRef.current) hourRef.current.style.transform = `rotate(${hourDeg}deg)`;
      if (minRef.current) minRef.current.style.transform = `rotate(${minuteDeg}deg)`;
      if (secRef.current) secRef.current.style.transform = `rotate(${secondDeg}deg)`;

      if (dotRef.current) {
        const angleRad = (hourDeg - 90) * (Math.PI / 180);
        const r = 118;
        dotRef.current.style.left = `${125 + r * Math.cos(angleRad)}px`;
        dotRef.current.style.top = `${125 + r * Math.sin(angleRad)}px`;
      }

      rafId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="widget widget--clock glass-panel">
      <div className="analog-clock">
        {/* Task arcs/dots behind the hour markers and hands */}
        {taskVisuals.length > 0 && (
          <svg
            className="clock-task-svg"
            viewBox="-1 -1 2 2"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            {taskVisuals.map((tv) =>
              tv.arcPath ? (
                <path
                  key={tv.id}
                  d={tv.arcPath}
                  fill="none"
                  stroke={tv.color}
                  strokeWidth={0.09}
                  strokeLinecap="round"
                  opacity={tv.completed ? 0.3 : 0.85}
                />
              ) : null,
            )}
            {taskVisuals.map((tv) => (
              <circle
                key={`dot-${tv.id}`}
                cx={tv.startX}
                cy={tv.startY}
                r={0.045}
                fill={tv.color}
                opacity={tv.completed ? 0.4 : 1}
              />
            ))}
          </svg>
        )}

        {markers.map((m) => (
          <div
            key={`marker-${m.hour}`}
            className={`clock-marker${m.isMajor ? ' major' : ''}`}
            style={{ transform: `rotate(${m.rotation}deg)` }}
          />
        ))}
        {markers
          .filter((m) => m.isMajor && m.numberStyle)
          .map((m) => (
            <div
              key={`num-${m.hour}`}
              className="clock-number"
              style={{
                left: m.numberStyle!.left,
                top: m.numberStyle!.top,
                transform: 'translateX(-50%)',
              }}
            >
              {m.label}
            </div>
          ))}
        <div ref={hourRef} className="hand hour-hand" />
        <div ref={minRef} className="hand minute-hand" />
        <div ref={secRef} className="hand second-hand" />
        <div className="center-dot" />
        <div ref={dotRef} className="current-time-dot" />
      </div>
    </div>
  );
}
