import { useEffect, useMemo, useRef } from 'react';
import { useMergedQuickTasks } from '../../hooks/useMergedQuickTasks';
import { addMinutes, todayKey } from '../../lib/date';
import { TASK_COLORS } from './QuickTasks';
import type { QuickTask } from '../../lib/types';

// All-SVG analog clock. viewBox is 0..100 in both axes, with the face
// centered at (50,50) and radius 48. Scales fluidly with the container,
// so the widget works at 2×2 just as well as 5×5.

interface Marker {
  hour: number;
  isMajor: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface NumberLabel {
  hour: number;
  label: string;
  x: number;
  y: number;
}

function polar(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return [50 + r * Math.cos(rad), 50 + r * Math.sin(rad)];
}

function buildMarkers(): Marker[] {
  const out: Marker[] = [];
  for (let i = 0; i < 12; i++) {
    const isMajor = i % 3 === 0;
    const angle = i * 30;
    const [x1, y1] = polar(angle, isMajor ? 41 : 44);
    const [x2, y2] = polar(angle, 47.5);
    out.push({ hour: i, isMajor, x1, y1, x2, y2 });
  }
  return out;
}

function buildNumbers(): NumberLabel[] {
  const out: NumberLabel[] = [];
  for (const h of [0, 3, 6, 9]) {
    const [x, y] = polar(h * 30, 34);
    out.push({ hour: h, label: h === 0 ? '12' : String(h), x, y });
  }
  return out;
}

function timeToDeg(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (((h ?? 0) % 12) + (m ?? 0) / 60) * 30;
}

// SVG arc path in 0..100 coords. Radius is in the same units.
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
  startX: number;
  startY: number;
  arcPath: string | null;
}

// Radius just inside the face edge — arcs sit on top of the hour markers.
const TASK_RADIUS = 50.5;

function buildTaskVisuals(tasks: QuickTask[]): TaskVisual[] {
  return tasks
    .filter((t) => t.time)
    .map((t) => {
      const color = t.color ?? TASK_COLORS[0]!;
      const startDeg = timeToDeg(t.time);
      const [startX, startY] = polar(startDeg, TASK_RADIUS);
      const path =
        t.duration > 0
          ? arcPath(
              startDeg,
              timeToDeg(addMinutes(t.time, t.duration)),
              TASK_RADIUS,
            )
          : null;
      return {
        id: t.id,
        color,
        completed: t.completed,
        startX,
        startY,
        arcPath: path,
      };
    });
}

export function Clock() {
  const hourRef = useRef<SVGLineElement>(null);
  const minRef = useRef<SVGLineElement>(null);
  const secRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  const markers = useMemo(buildMarkers, []);
  const numbers = useMemo(buildNumbers, []);

  const tasksByDate = useMergedQuickTasks();
  const todayTasks = tasksByDate[todayKey()] ?? [];
  const taskVisuals = useMemo(() => buildTaskVisuals(todayTasks), [todayTasks]);

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

      if (hourRef.current)
        hourRef.current.setAttribute('transform', `rotate(${hourDeg} 50 50)`);
      if (minRef.current)
        minRef.current.setAttribute('transform', `rotate(${minuteDeg} 50 50)`);
      if (secRef.current)
        secRef.current.setAttribute('transform', `rotate(${secondDeg} 50 50)`);

      if (dotRef.current) {
        const [dx, dy] = polar(hourDeg, 47.5);
        dotRef.current.setAttribute('cx', String(dx));
        dotRef.current.setAttribute('cy', String(dy));
      }

      rafId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="widget widget--clock glass-panel">
      <svg
        className="analog-clock-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {/* Face */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="rgba(0, 0, 0, 0.15)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="0.8"
        />

        {/* Task arcs (behind everything else) */}
        {taskVisuals.map(
          (tv) =>
            tv.arcPath && (
              <path
                key={`arc-${tv.id}`}
                d={tv.arcPath}
                fill="none"
                stroke={tv.color}
                strokeWidth={3.5}
                strokeLinecap="round"
                opacity={tv.completed ? 0.3 : 0.85}
              />
            ),
        )}
        {taskVisuals.map((tv) => (
          <circle
            key={`dot-${tv.id}`}
            cx={tv.startX}
            cy={tv.startY}
            r={2}
            fill={tv.color}
            opacity={tv.completed ? 0.4 : 1}
          />
        ))}

        {/* Markers */}
        {markers.map((m) => (
          <line
            key={`mark-${m.hour}`}
            x1={m.x1}
            y1={m.y1}
            x2={m.x2}
            y2={m.y2}
            stroke={m.isMajor ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.35)'}
            strokeWidth={m.isMajor ? 1.5 : 0.7}
            strokeLinecap="round"
          />
        ))}

        {/* Hour numbers — scale with the SVG, so still readable at 2×2 */}
        {numbers.map((n) => (
          <text
            key={`num-${n.hour}`}
            x={n.x}
            y={n.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="6"
            fontFamily="Inter, system-ui, sans-serif"
            fill="rgba(255, 255, 255, 0.8)"
          >
            {n.label}
          </text>
        ))}

        {/* Hands — animated via setAttribute('transform') in the rAF loop */}
        <line
          ref={hourRef}
          x1="50"
          y1="50"
          x2="50"
          y2="27"
          stroke="rgba(224, 224, 224, 0.95)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <line
          ref={minRef}
          x1="50"
          y1="50"
          x2="50"
          y2="14"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <line
          ref={secRef}
          x1="50"
          y1="50"
          x2="50"
          y2="8"
          stroke="#ff5252"
          strokeWidth="0.7"
          strokeLinecap="round"
        />

        {/* Center pin */}
        <circle cx="50" cy="50" r="2.2" fill="white" />
        <circle cx="50" cy="50" r="0.9" fill="#6b4f42" />

        {/* Current-time green tracker on the perimeter */}
        <circle
          ref={dotRef}
          cx="50"
          cy="2.5"
          r="1.7"
          fill="#00e676"
          filter="url(#clockGlow)"
        />

        {/* Faint glow around the green dot */}
        <defs>
          <filter id="clockGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.6" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="1.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
}
