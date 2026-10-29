"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { computeActivity } from "@/lib/activity";
import { dataMode } from "@/lib/config";
import { getDemoActivity, type ActivityPoint, type ActivityRange } from "@/lib/demo/demoActivity";
import type { Lead } from "@/lib/types";

const SERIES: { key: keyof Omit<ActivityPoint, "label">; label: string; color: string }[] = [
  { key: "found", label: "Gevonden", color: "#8b5cf6" },
  { key: "saved", label: "Bewaard", color: "#60a5fa" },
  { key: "contacted", label: "Benaderd", color: "#f5a524" },
  { key: "converted", label: "Gewonnen", color: "#34d399" },
];

const H = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };

/** Simple dependency-free SVG line chart with a hover crosshair. */
export function ActivityChart({ leads }: { leads: Lead[] }) {
  const [range, setRange] = useState<ActivityRange>("day");
  const [hover, setHover] = useState<number | null>(null);
  // Demo mode shows a fictional series; otherwise the chart uses real timestamps.
  const data = useMemo(() => (dataMode === "demo" ? getDemoActivity(range) : computeActivity(leads, range)), [range, leads]);

  // Render at the real pixel width so text and lines are never stretched.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(800);
  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver(([entry]) => setW(Math.max(280, entry.contentRect.width)));
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(...data.map((d) => d.found), 1);
  const niceMax = max <= 10 ? Math.max(4, Math.ceil(max / 4) * 4) : Math.ceil(max / 10) * 10;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / niceMax) * innerH;

  const path = (key: (typeof SERIES)[number]["key"]) => data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d[key])}`).join(" ");
  const area = `${path("found")} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Activiteit {dataMode === "demo" && <Badge tone="accent">Demogegevens</Badge>}
          </span>
        }
        description="Gevonden, bewaard, benaderd en gewonnen."
        action={
          <Tabs
            size="sm"
            value={range}
            onChange={setRange}
            items={[
              { value: "day", label: "Dag" },
              { value: "week", label: "Week" },
              { value: "month", label: "Maand" },
            ]}
          />
        }
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 pt-4">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div ref={wrapperRef} className="relative mx-2 mt-2 mb-3 overflow-hidden">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="foundFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(niceMax * t)} y2={y(niceMax * t)} stroke="var(--color-chart-line)" strokeDasharray={t === 0 ? "0" : "3 4"} />
              <text x={PAD.left - 8} y={y(niceMax * t) + 4} textAnchor="end" fontSize="10" fill="var(--color-chart-label)">
                {Math.round(niceMax * t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => (
            <text key={d.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-chart-label)">
              {i % (W < 600 ? 3 : data.length > 10 ? 2 : 1) === 0 ? d.label : ""}
            </text>
          ))}

          <path d={area} fill="url(#foundFill)" />
          {SERIES.map((s) => (
            <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth={s.key === "found" ? 2 : 1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}

          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="var(--color-line-strong)" />
              {SERIES.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(data[hover][s.key])} r={3.5} fill={s.color} stroke="var(--color-surface)" strokeWidth={2} />
              ))}
            </g>
          )}

          {/* Invisible hover targets per data point */}
          {data.map((d, i) => (
            <rect
              key={d.label}
              x={x(i) - innerW / data.length / 2}
              y={PAD.top}
              width={innerW / data.length}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute top-4 rounded-lg border border-line-strong bg-elevated px-3 py-2 text-xs shadow-xl"
            style={{ left: `clamp(8px, calc(${(x(hover) / W) * 100}% - 70px), calc(100% - 160px))` }}
          >
            <div className="mb-1 font-medium text-fg">{data[hover].label}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-4 text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                  {s.label.replace("Leads ", "")}
                </span>
                <span className="text-fg tabular-nums">{data[hover][s.key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
