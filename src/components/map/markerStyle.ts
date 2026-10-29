import type { Lead } from "@/lib/types";

export type MarkerKind = "hot" | "warm" | "low" | "saved" | "contacted" | "won" | "lost";

export const MARKER_COLORS: Record<MarkerKind, { color: string; label: string }> = {
  hot: { color: "#f97366", label: "Heet" },
  warm: { color: "#f5a524", label: "Warm" },
  low: { color: "#8b8b96", label: "Laag" },
  saved: { color: "#a78bfa", label: "Bewaard" },
  contacted: { color: "#60a5fa", label: "Benaderd" },
  won: { color: "#34d399", label: "Gewonnen" },
  lost: { color: "#52525b", label: "Verloren" },
};

/** CRM status wins over score tier, so you can see your pipeline on the map. */
export function markerKind(lead: Lead): MarkerKind {
  const s = lead.crm.status;
  if (s === "won") return "won";
  if (s === "lost") return "lost";
  if (s === "contacted" || s === "follow_up" || s === "meeting" || s === "proposal") return "contacted";
  if (lead.crm.starred || s === "saved") return "saved";
  return lead.score.tier;
}
