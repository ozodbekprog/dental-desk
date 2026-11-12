"use client";

import { useId } from "react";

export type TrendPoint = { label: string; count: number };

export type DonutSegment = { key: string; label: string; value: number; color: string };

export type WeekdayPoint = { label: string; count: number };

const AXIS_FILL = "var(--color-muted)";
const GRID_STROKE = "var(--color-line)";

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const gid = `trend-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const W = 660;
  const H = 216;
  const padL = 30;
  const padR = 10;
  const padT = 16;
  const padB = 28;

  const max = Math.max(4, ...data.map((d) => d.count));
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const x = (i: number) => padL + i * stepX;
  const y = (v: number) => H - padB - (v / max) * innerH;

  const line = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.count).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;
  const gridValues = [max, Math.round(max / 2), 0];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Oxirgi 30 kundagi so'rovlar oqimi"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c6a72" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#0c6a72" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {gridValues.map((value) => (
        <g key={value}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(value)}
            y2={y(value)}
            stroke={GRID_STROKE}
            strokeWidth="1"
            strokeDasharray={value === 0 ? undefined : "3 5"}
          />
          <text x={padL - 8} y={y(value) + 3.5} textAnchor="end" fontSize="10" fill={AXIS_FILL}>
            {value}
          </text>
        </g>
      ))}

      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="dd-chart-line"
      />

      {data.map((d, i) =>
        d.count > 0 ? (
          <circle key={d.label} cx={x(i)} cy={y(d.count)} r="3" fill="var(--color-accent)">
            <title>{`${d.label}: ${d.count} so'rov`}</title>
          </circle>
        ) : null
      )}

      {data.map((d, i) =>
        i % 5 === 0 || i === data.length - 1 ? (
          <text
            key={`label-${d.label}`}
            x={x(i)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
            fontSize="10"
            fill={AXIS_FILL}
          >
            {d.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

export function StatusDonut({
  segments,
  total,
}: {
  segments: DonutSegment[];
  total: number;
}) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const visible = segments.filter((segment) => segment.value > 0);
  let consumed = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label="So'rovlar holati taqsimoti">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-surface-2)" strokeWidth="16" />
        {visible.map((segment) => {
          const length = total > 0 ? (segment.value / total) * C : 0;
          const dashOffset = -consumed;
          consumed += length;
          return (
            <circle
              key={segment.key}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={segment.color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(length - 2, 0.5)} ${C}`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
            >
              <title>{`${segment.label}: ${segment.value}`}</title>
            </circle>
          );
        })}
        <text x="70" y="68" textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--color-ink)">
          {total}
        </text>
        <text x="70" y="84" textAnchor="middle" fontSize="10" fill={AXIS_FILL}>
          SO&apos;ROVLAR
        </text>
      </svg>

      <ul className="w-full space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-ink-soft">{segment.label}</span>
            <span className="dd-mono font-semibold text-ink">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeekdayBars({ data }: { data: WeekdayPoint[] }) {
  const W = 660;
  const H = 190;
  const padL = 14;
  const padR = 14;
  const padT = 20;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(2, ...data.map((d) => d.count));
  const slot = innerW / data.length;
  const barW = Math.min(46, slot * 0.52);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Hafta kunlari bo'yicha qabullar"
    >
      <line
        x1={padL}
        x2={W - padR}
        y1={H - padB}
        y2={H - padB}
        stroke={GRID_STROKE}
        strokeWidth="1"
      />
      {data.map((d, i) => {
        const cx = padL + i * slot + slot / 2;
        const height = Math.max(d.count > 0 ? 6 : 2, (d.count / max) * innerH);
        const isPeak = d.count === max && max > 0;
        return (
          <g key={d.label}>
            <rect
              x={cx - barW / 2}
              y={H - padB - height}
              width={barW}
              height={height}
              rx="7"
              fill={isPeak ? "var(--color-accent)" : "var(--color-accent-soft)"}
              className="dd-bar"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <title>{`${d.label}: ${d.count} qabul`}</title>
            </rect>
            <text
              x={cx}
              y={H - padB - height - 7}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={isPeak ? "var(--color-accent)" : "var(--color-ink-soft)"}
            >
              {d.count}
            </text>
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill={AXIS_FILL}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
