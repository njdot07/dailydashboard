import { useEffect, useMemo, useRef } from 'react';

// Markers only depend on hour index, not time — compute once.
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

export function Clock() {
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);
  const secRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  const markers = useMemo(buildMarkers, []);

  // Drive hand rotations via refs so the 60fps animation doesn't re-render
  // the 12 static markers every tick.
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
