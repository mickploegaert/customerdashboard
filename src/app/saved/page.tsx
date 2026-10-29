"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { LeadCard } from "@/components/leads/LeadCard";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CONTACTED_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/format";
import { useLeadStore } from "@/lib/store/LeadStore";
import type { Lead } from "@/lib/types";

const FILTERS: { key: string; label: string; test: (l: Lead) => boolean }[] = [
  { key: "all", label: "Alles", test: () => true },
  { key: "hot", label: "Heet", test: (l) => l.score.tier === "hot" },
  { key: "warm", label: "Warm", test: (l) => l.score.tier === "warm" },
  { key: "no_website", label: "Geen website", test: (l) => l.websiteStatus === "none" },
  { key: "old_website", label: "Oude site", test: (l) => l.websiteStatus === "outdated" },
  { key: "contacted", label: "Benaderd", test: (l) => CONTACTED_STATUSES.includes(l.crm.status) },
  { key: "not_contacted", label: "Nog niet benaderd", test: (l) => !CONTACTED_STATUSES.includes(l.crm.status) && l.crm.status !== "lost" },
];

export default function SavedLeadsPage() {
  const { leads } = useLeadStore();
  const [filter, setFilter] = useState("all");
  const saved = leads.filter((l) => l.crm.starred).sort((a, b) => b.score.total - a.score.total);
  const active = FILTERS.find((f) => f.key === filter)!;
  const shown = saved.filter(active.test);

  return (
    <PageContainer>
      <PageHeader title="Bewaarde leads" description={saved.length === 1 ? "1 lead met een ster" : `${saved.length} leads met een ster`} />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = saved.filter(f.test).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
                filter === f.key ? "border-accent/50 bg-accent-soft text-accent-text" : "border-line-strong text-muted hover:bg-hover hover:text-fg",
              )}
            >
              {f.label}
              <span className="text-subtle tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Star className="size-5" />}
            title={saved.length === 0 ? "Nog niets bewaard" : "Niets met dit filter"}
            description="Klik op de ster bij een lead om hem hier te zetten."
            action={<ButtonLink href="/leads">Naar leads</ButtonLink>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((lead) => (
            <LeadCard key={lead.business.id} lead={lead} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
