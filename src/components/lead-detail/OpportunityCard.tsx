import { OpportunityBadges } from "@/components/leads/LeadBadges";
import { ScoreBreakdown } from "@/components/leads/ScoreBreakdown";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/format";
import type { Lead } from "@/lib/types";

function opportunityLevel(score: number) {
  if (score >= 85) return { label: "Zeer hoog", className: "text-hot" };
  if (score >= 70) return { label: "Hoog", className: "text-warm" };
  if (score >= 55) return { label: "Middel", className: "text-accent-text" };
  return { label: "Laag", className: "text-low" };
}

/** "Why this is a good lead" – the transparent score explanation. */
export function OpportunityCard({ lead }: { lead: Lead }) {
  const level = opportunityLevel(lead.score.total);
  return (
    <Card>
      <CardHeader
        title="Waarom deze lead"
        description="Elk punt van de score, uitgelegd."
        action={
          <div className="text-right">
            <div className="text-[11px] text-subtle">Kans</div>
            <div className={cn("text-sm font-semibold", level.className)}>{level.label}</div>
          </div>
        }
      />
      <div className="space-y-4 p-5">
        {lead.opportunities.length > 0 && <OpportunityBadges items={lead.opportunities} />}
        <ScoreBreakdown lead={lead} />
      </div>
    </Card>
  );
}
