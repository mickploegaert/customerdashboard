"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { industryLabel } from "@/lib/constants";
import { cn } from "@/lib/format";
import type { Lead } from "@/lib/types";
import { LeadScoreBadge, OpportunityBadges, Rating, StatusBadge, WebsiteStatusBadge } from "./LeadBadges";
import { StarButton } from "./StarButton";

/**
 * Lead summary card. With `onSelect` it acts as a selectable list item
 * (split view); otherwise it links to the lead detail page.
 */
export function LeadCard({ lead, selected, onSelect, compact }: { lead: Lead; selected?: boolean; onSelect?: () => void; compact?: boolean }) {
  const b = lead.business;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-fg">{b.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-subtle">
            {industryLabel(b.industry)} · <MapPin className="size-3" /> {b.city}, {b.countryCode}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <LeadScoreBadge score={lead.score} size="sm" />
          <StarButton id={b.id} starred={lead.crm.starred} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <Rating rating={b.rating} reviews={b.reviewCount} />
        <WebsiteStatusBadge status={lead.websiteStatus} />
        {lead.crm.status !== "new" && <StatusBadge status={lead.crm.status} />}
      </div>
      {!compact && lead.opportunities.length > 0 && (
        <div className="mt-3">
          <OpportunityBadges items={lead.opportunities} max={3} />
        </div>
      )}
    </>
  );

  const classes = cn(
    "block w-full rounded-xl border p-4 text-left transition-all duration-150",
    selected ? "border-accent/60 bg-accent-soft ring-1 ring-accent/30" : "border-line bg-surface hover:border-line-strong hover:bg-elevated",
  );

  if (onSelect) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={onSelect}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect())}
        className={cn(classes, "cursor-pointer")}
      >
        {body}
      </div>
    );
  }
  return (
    <Link href={`/leads/${b.id}`} className={classes}>
      {body}
    </Link>
  );
}
