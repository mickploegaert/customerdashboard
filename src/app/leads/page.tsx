"use client";

import { useSearchParams } from "next/navigation";
import { Download, Search, Users } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { LeadCard } from "@/components/leads/LeadCard";
import { LeadTable } from "@/components/leads/LeadTable";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Tooltip } from "@/components/ui/Tooltip";
import { industryLabel, LEAD_STATUSES, WEBSITE_STATUS_LABEL } from "@/lib/constants";
import { downloadCsv, leadsToCsv } from "@/lib/csv";
import { useLeadStore } from "@/lib/store/LeadStore";
import type { Lead } from "@/lib/types";

type SortKey = "score" | "reviews" | "rating" | "name";

function LeadsContent() {
  const params = useSearchParams();
  const { leads } = useLeadStore();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [tier, setTier] = useState("all");
  const [status, setStatus] = useState("all");
  const [website, setWebsite] = useState("all");
  const [sort, setSort] = useState<SortKey>("score");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Keep the filter in sync when searching from the top bar while already on this page.
  const urlQuery = params.get("q") ?? "";
  useEffect(() => setQuery(urlQuery), [urlQuery]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorters: Record<SortKey, (a: Lead, b: Lead) => number> = {
      score: (a, b) => b.score.total - a.score.total,
      reviews: (a, b) => b.business.reviewCount - a.business.reviewCount,
      rating: (a, b) => (b.business.rating ?? 0) - (a.business.rating ?? 0),
      name: (a, b) => a.business.name.localeCompare(b.business.name),
    };
    return leads
      .filter((l) => {
        const b = l.business;
        if (q && ![b.name, b.city, industryLabel(b.industry), b.industry, b.country].some((v) => v.toLowerCase().includes(q))) return false;
        if (tier !== "all" && l.score.tier !== tier) return false;
        if (status !== "all" && l.crm.status !== status) return false;
        if (website !== "all" && l.websiteStatus !== website) return false;
        return true;
      })
      .sort(sorters[sort]);
  }, [leads, query, tier, status, website, sort]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  function exportCsv() {
    const rows = selected.size > 0 ? filtered.filter((l) => selected.has(l.business.id)) : filtered;
    downloadCsv(`mk-studios-leads-${new Date().toISOString().slice(0, 10)}.csv`, leadsToCsv(rows));
  }

  const toggleAll = () =>
    setSelected((prev) => (filtered.every((l) => prev.has(l.business.id)) ? new Set() : new Set(filtered.map((l) => l.business.id))));

  return (
    <PageContainer>
      <PageHeader
        title="Leads"
        description={`${filtered.length} van ${leads.length}`}
        actions={
          <>
            <Tooltip content={selected.size > 0 ? "Exporteer de geselecteerde leads" : "Exporteer de huidige lijst"}>
              <Button icon={<Download className="size-4" />} onClick={exportCsv} disabled={filtered.length === 0}>
                CSV {selected.size > 0 ? `(${selected.size})` : `(${filtered.length})`}
              </Button>
            </Tooltip>
            <ButtonLink href="/search" variant="primary" icon={<Search className="size-4" />}>
              Nieuwe leads
            </ButtonLink>
          </>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="lg:w-72">
            <Input icon={<Search className="size-4" />} placeholder="Filter op naam, plaats of branche…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            <Select
              aria-label="Leadscore"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              options={[
                { value: "all", label: "Alle scores" },
                { value: "hot", label: "Heet" },
                { value: "warm", label: "Warm" },
                { value: "low", label: "Laag" },
              ]}
            />
            <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "all", label: "Alle statussen" }, ...LEAD_STATUSES]} />
            <Select
              aria-label="Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              options={[{ value: "all", label: "Alle websites" }, ...Object.entries(WEBSITE_STATUS_LABEL).map(([value, label]) => ({ value, label }))]}
            />
            <Select
              aria-label="Sorteren"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              options={[
                { value: "score", label: "Sorteren: leadscore" },
                { value: "reviews", label: "Sorteren: reviews" },
                { value: "rating", label: "Sorteren: score" },
                { value: "name", label: "Sorteren: naam" },
              ]}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<Users className="size-5" />} title="Geen leads met deze filters" description="Haal een filter weg of doe een nieuwe zoekopdracht." />
        ) : (
          <>
            <div className="hidden md:block">
              <LeadTable leads={filtered} selectable selected={selected} onToggleSelect={toggle} onToggleAll={toggleAll} />
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {filtered.map((lead) => (
                <LeadCard key={lead.business.id} lead={lead} />
              ))}
            </div>
          </>
        )}
      </Card>
    </PageContainer>
  );
}

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsContent />
    </Suspense>
  );
}
