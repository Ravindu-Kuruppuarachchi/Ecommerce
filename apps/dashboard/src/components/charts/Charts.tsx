"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// Chart tokens (dataviz reference palette, light mode; the dashboard has no dark mode yet).
// One series only, so a single hue carries it and the card title names it: no legend box.
const SERIES = "#2a78d6";
const GRID = "#e1e0d9";
const MUTED = "#898781";

/** Rounds an axis maximum up to a clean number (1, 2, 2.5 or 5 x a power of ten). */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * exp >= value)!;
  return step * exp;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export interface TimePoint {
  label: string;
  value: number;
  /** Extra rows shown in the tooltip (e.g. orders, visitors) - never a second axis. */
  details: Array<{ label: string; value: string }>;
}

/**
 * Single-series line with an area wash, hairline grid and a crosshair that
 * snaps to the nearest day. Keyboard: focus the chart and use arrow keys.
 */
export function LineChart({ points, format, ariaLabel }: { points: TimePoint[]; format: (v: number) => string; ariaLabel: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const height = 240;
  const pad = { top: 12, right: 12, bottom: 28, left: 72 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;

  const max = useMemo(() => niceMax(Math.max(...points.map((p) => p.value), 0)), [points]);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const x = (i: number) => pad.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = points.length ? `${line}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z` : "";
  // Around six date labels whatever the range.
  const every = Math.max(1, Math.ceil(points.length / 6));

  const pick = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const rel = (clientX - rect.left - pad.left) / Math.max(innerW, 1);
    setActive(Math.min(points.length - 1, Math.max(0, Math.round(rel * (points.length - 1)))));
  };

  const point = active !== null ? points[active] : null;
  const tooltipLeft = active !== null ? Math.min(Math.max(x(active) + 12, 0), Math.max(width - 190, 0)) : 0;

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          onPointerMove={(e) => pick(e.clientX)}
          onPointerLeave={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setActive((a) => Math.min(points.length - 1, (a ?? -1) + 1));
            if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? points.length) - 1));
          }}
          onBlur={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={MUTED} className="tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % every === 0 || i === points.length - 1 ? (
              // Edge labels anchor inward so they aren't clipped by the chart bounds.
              <text key={p.label} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize={11} fill={MUTED}>
                {p.label}
              </text>
            ) : null,
          )}
          <path d={area} fill={SERIES} opacity={0.1} />
          <path d={line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active !== null && (
            <>
              <line x1={x(active)} x2={x(active)} y1={pad.top} y2={pad.top + innerH} stroke={MUTED} strokeWidth={1} />
              <circle cx={x(active)} cy={y(points[active].value)} r={5} fill={SERIES} stroke="#ffffff" strokeWidth={2} />
            </>
          )}
        </svg>
      )}
      {point && (
        <div
          role="status"
          className="pointer-events-none absolute top-2 min-w-[170px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: tooltipLeft }}
        >
          <p className="text-gray-500">{point.label}</p>
          <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <span className="inline-block h-0.5 w-3 rounded" style={{ background: SERIES }} />
            {format(point.value)}
          </p>
          {point.details.map((d) => (
            <p key={d.label} className="mt-0.5 flex justify-between gap-4 text-gray-600">
              <span>{d.label}</span>
              <span className="font-medium text-gray-900">{d.value}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  display: string;
  /** Secondary text beside the value, e.g. a share. */
  note?: string;
}

/** Horizontal bars in one colour, value at the tip. Hover or focus a row for its tooltip. */
export function BarList({ data, empty }: { data: BarDatum[]; empty: ReactNode }) {
  if (!data.length) return <p className="py-6 text-center text-sm text-gray-500">{empty}</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label} tabIndex={0} className="group rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40" title={`${d.label}: ${d.display}${d.note ? ` (${d.note})` : ""}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-gray-700">{d.label}</span>
            <span className="shrink-0 tabular-nums text-gray-900">
              {d.display}
              {d.note && <span className="ml-1.5 text-xs text-gray-500">{d.note}</span>}
            </span>
          </div>
          <div className="h-2.5">
            <div
              className="h-full rounded-r transition-opacity group-hover:opacity-80"
              style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 1.5 : 0)}%`, background: SERIES }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
