"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/format";
import { MARKER_COLORS, type MarkerKind } from "./markerStyle";

/** Leaflet needs `window`, so the map is only loaded in the browser. */
export const LeadMap = dynamic(() => import("./LeadMapClient"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[300px] w-full animate-pulse bg-elevated" />,
});

export function MapLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted", className)}>
      {(Object.keys(MARKER_COLORS) as MarkerKind[]).map((kind) => (
        <span key={kind} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full ring-1 ring-black/40" style={{ background: MARKER_COLORS[kind].color }} />
          {MARKER_COLORS[kind].label}
        </span>
      ))}
    </div>
  );
}
