/**
 * FICTIONAL activity series for the dashboard chart in demo mode.
 * In Phase 2 this will be calculated from timestamps in Supabase.
 */

export type ActivityRange = "day" | "week" | "month";

export interface ActivityPoint {
  label: string;
  found: number;
  saved: number;
  contacted: number;
  converted: number;
}

// Small deterministic pseudo-random generator so the chart is stable between renders.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function getDemoActivity(range: ActivityRange): ActivityPoint[] {
  const count = range === "day" ? 14 : range === "week" ? 12 : 12;
  const scale = range === "day" ? 1 : range === "week" ? 6 : 24;
  const rand = seeded(range === "day" ? 7 : range === "week" ? 13 : 29);
  const now = new Date();

  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i;
    const d = new Date(now);
    let label: string;
    if (range === "day") {
      d.setDate(d.getDate() - offset);
      label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } else if (range === "week") {
      d.setDate(d.getDate() - offset * 7);
      label = `W${getIsoWeek(d)}`;
    } else {
      d.setMonth(d.getMonth() - offset);
      label = d.toLocaleDateString("en-GB", { month: "short" });
    }
    const trend = 1 + i / count;
    const found = Math.round((8 + rand() * 10) * scale * trend);
    const saved = Math.round(found * (0.25 + rand() * 0.1));
    const contacted = Math.round(saved * (0.45 + rand() * 0.15));
    const converted = Math.round(contacted * (0.1 + rand() * 0.1));
    return { label, found, saved, contacted, converted };
  });
}

function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
