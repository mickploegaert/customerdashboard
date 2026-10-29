import { Star } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { OPPORTUNITY_META, STATUS_LABEL, TIER_LABEL, WEBSITE_STATUS_LABEL } from "@/lib/constants";
import { cn, formatNumber } from "@/lib/format";
import type { LeadScore, LeadStatus, OpportunityKey, WebsiteStatus } from "@/lib/types";

const TIER_STYLE = {
  hot: { emoji: "🔥", className: "bg-hot/10 text-hot border-hot/30" },
  warm: { emoji: "🟠", className: "bg-warm/10 text-warm border-warm/30" },
  low: { emoji: "⚪", className: "bg-tint text-low border-line-strong" },
} as const;

/** e.g. "🔥 94 HOT" */
export function LeadScoreBadge({ score, size = "md" }: { score: LeadScore; size?: "sm" | "md" | "lg" }) {
  const style = TIER_STYLE[score.tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border font-semibold tabular-nums whitespace-nowrap",
        style.className,
        size === "sm" && "px-1.5 py-0.5 text-[11px]",
        size === "md" && "px-2 py-0.5 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm",
      )}
    >
      <span aria-hidden className={size === "lg" ? "text-base" : "text-[11px]"}>{style.emoji}</span>
      {score.total}
      <span className="text-[0.85em] tracking-wide opacity-80">{TIER_LABEL[score.tier].toUpperCase()}</span>
    </span>
  );
}

const STATUS_TONE: Record<LeadStatus, BadgeTone> = {
  new: "neutral",
  researching: "info",
  saved: "accent",
  contacted: "info",
  follow_up: "warm",
  meeting: "accent",
  proposal: "accent",
  won: "success",
  lost: "danger",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

const WEBSITE_TONE: Record<WebsiteStatus, BadgeTone> = {
  none: "hot",
  broken: "danger",
  outdated: "warm",
  needs_work: "warm",
  good: "success",
  not_analyzed: "neutral",
};

export function WebsiteStatusBadge({ status }: { status: WebsiteStatus }) {
  return <Badge tone={WEBSITE_TONE[status]}>{WEBSITE_STATUS_LABEL[status]}</Badge>;
}

export function OpportunityBadges({ items, max }: { items: OpportunityKey[]; max?: number }) {
  const shown = max ? items.slice(0, max) : items;
  const hidden = items.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((key) => (
        <Tooltip key={key} content={OPPORTUNITY_META[key].description}>
          <Badge tone="neutral" className="cursor-default">
            <span aria-hidden>{OPPORTUNITY_META[key].emoji}</span>
            {OPPORTUNITY_META[key].label}
          </Badge>
        </Tooltip>
      ))}
      {hidden > 0 && <Badge tone="neutral">+{hidden}</Badge>}
    </div>
  );
}

export function Rating({ rating, reviews }: { rating: number | null; reviews?: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Star className="size-3.5 fill-warm text-warm" />
      <span className="text-fg">{rating !== null ? rating.toFixed(1) : "–"}</span>
      {rating !== null && reviews !== undefined && <span className="text-subtle">({formatNumber(reviews)})</span>}
    </span>
  );
}

/** Small coloured bar for 0–100 scores (website score). */
export function ScoreBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-subtle">–</span>;
  const color = value >= 70 ? "bg-success" : value >= 45 ? "bg-warm" : "bg-hot";
  return (
    <span className="inline-flex items-center gap-2 tabular-nums">
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-tint">
        <span className={cn("block h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </span>
      <span className="text-xs text-muted">{value}</span>
    </span>
  );
}
