import type { ActivityPoint, ActivityRange } from "./demo/demoActivity";
import type { Lead } from "./types";

/**
 * Calculates the lead activity chart from real timestamps:
 * found = lead created, saved = starred, contacted = first contact, converted = won.
 */
export function computeActivity(leads: Lead[], range: ActivityRange): ActivityPoint[] {
  const count = range === "day" ? 14 : 12;
  const now = new Date();
  const buckets: { start: Date; end: Date; label: string }[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    let end: Date;
    let label: string;
    if (range === "day") {
      start.setDate(start.getDate() - i);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      label = start.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } else if (range === "week") {
      const day = (start.getDay() + 6) % 7; // Monday = 0
      start.setDate(start.getDate() - day - i * 7);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      label = start.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } else {
      start.setDate(1);
      start.setMonth(start.getMonth() - i);
      end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      label = start.toLocaleDateString("en-GB", { month: "short" });
    }
    buckets.push({ start, end, label });
  }

  const inBucket = (iso: string | null | undefined, b: { start: Date; end: Date }) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= b.start.getTime() && t < b.end.getTime();
  };

  return buckets.map((b) => ({
    label: b.label,
    found: leads.filter((l) => inBucket(l.crm.createdAt, b)).length,
    saved: leads.filter((l) => inBucket(l.crm.savedAt, b)).length,
    contacted: leads.filter((l) => {
      const first = [...l.crm.contacts].sort((x, y) => x.contactedAt.localeCompare(y.contactedAt))[0];
      return inBucket(first?.contactedAt, b);
    }).length,
    converted: leads.filter((l) => inBucket(l.crm.wonAt, b)).length,
  }));
}
