import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { LeadScoreBadge, WebsiteStatusBadge } from "@/components/leads/LeadBadges";
import { formatNumber } from "@/lib/format";
import type { Lead } from "@/lib/types";

/** Top 10 open leads that haven't been contacted yet, ranked by lead score. */
export function RecommendedLeads({ leads }: { leads: Lead[] }) {
  const top = leads
    .filter((l) => ["new", "researching", "saved"].includes(l.crm.status))
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, 10);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent-text" /> Eerst bellen
          </span>
        }
        description="Beste leads die je nog niet hebt benaderd."
      />
      <ol className="flex-1 divide-y divide-line px-2 py-1">
        {top.map((lead, i) => (
          <li key={lead.business.id}>
            <Link href={`/leads/${lead.business.id}`} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-hover">
              <span className="w-4 text-xs text-subtle tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{lead.business.name}</span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-subtle">
                  <WebsiteStatusBadge status={lead.websiteStatus} />
                  {lead.business.rating !== null ? `${formatNumber(lead.business.reviewCount)} reviews` : "Reviews onbekend"}
                </span>
              </span>
              <LeadScoreBadge score={lead.score} size="sm" />
              <ChevronRight className="size-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
