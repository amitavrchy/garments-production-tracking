'use client';
import { useState } from 'react';
import { number } from '@/lib/types';
export function OutputChart({
  data,
}: {
  data: { hour: number; actual: number; target: number; recorded?: boolean }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(100, ...data.map((d) => Math.max(d.actual, d.target))) * 1.15;
  const width = 720,
    height = 220,
    left = 48,
    bottom = 30,
    top = 12,
    inner = width - left - 28,
    plot = height - bottom - top;
  const x = (i: number) => left + i * (inner / (data.length - 1)),
    y = (v: number) => height - bottom - (v / max) * plot;
  const recorded = data.map((d, i) => ({ ...d, index: i })).filter((d) => d.recorded !== false);
  const points = recorded.map((d) => `${x(d.index)},${y(d.actual)}`).join(' ');
  const target = data.map((d, i) => `${x(i)},${y(d.target)}`).join(' ');
  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Hourly production: ${data.map((d) => `${d.hour}:00 ${d.recorded === false ? 'no entry yet' : `${d.actual} pieces`}`).join(', ')}`}
      >
        <defs>
          <linearGradient id="output-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#de6548" stopOpacity=".18" />
            <stop offset="100%" stopColor="#de6548" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((t) => (
          <g key={t}>
            <line
              x1={left}
              x2={width - 10}
              y1={y((max * t) / 4)}
              y2={y((max * t) / 4)}
              stroke="#eaece9"
              strokeDasharray="3 5"
            />
            <text
              x={left - 12}
              y={y((max * t) / 4) + 5}
              textAnchor="end"
              fill="#8b908a"
              fontSize="16"
            >
              {Math.round((max * t) / 4)}
            </text>
          </g>
        ))}
        {recorded.length > 0 && (
          <polygon
            points={`${x(recorded[0].index)},${height - bottom} ${points} ${x(recorded[recorded.length - 1].index)},${height - bottom}`}
            fill="url(#output-fill)"
          />
        )}
        <polyline
          points={target}
          fill="none"
          stroke="#a2aaa3"
          strokeWidth="2"
          strokeDasharray="5 6"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#dc6546"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => (
          <g key={d.hour}>
            {d.recorded !== false && (
              <circle
                cx={x(i)}
                cy={y(d.actual)}
                r={hover === i ? 5 : 3.5}
                fill="white"
                stroke="#dc6546"
                strokeWidth="2"
              />
            )}
            <text x={x(i)} y={height - 4} textAnchor="middle" fill="#727b6e" fontSize="16">
              {String(d.hour).padStart(2, '0')}:00
            </text>
            <rect
              x={x(i) - inner / data.length / 2}
              y={0}
              width={inner / data.length}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="chart-tooltip">
          {data[hover].hour}:00 ·{' '}
          <strong>
            {data[hover].recorded === false ? 'No entry yet' : `${number(data[hover].actual)} pcs`}
          </strong>{' '}
          · Target {Math.round(data[hover].target)}
        </div>
      )}
    </div>
  );
}
export function Donut({ value, label }: { value: number; label: string }) {
  const p = Math.min(100, Math.max(0, value));
  return (
    <div
      className="donut"
      style={{ background: `conic-gradient(#dc6546 ${p}%, #f0eeea 0)` }}
      role="img"
      aria-label={`${label}: ${value.toFixed(1)} percent`}
    >
      <div>
        <strong>
          {value.toFixed(1)}
          <span>%</span>
        </strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
