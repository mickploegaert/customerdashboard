"use client";

import { ChartColumn } from "lucide-react";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { PageContainer } from "@/components/layout/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CONTACTED_STATUSES, industryLabel, LEAD_STATUSES, WEBSITE_STATUS_LABEL } from "@/lib/constants";
import { cn, formatCurrency, formatNumber } from "@/lib/format";
import { estimatedProjectValue } from "@/lib/leads";
import { useLeadStore } from "@/lib/store/LeadStore";
import type { LeadStatus, WebsiteStatus } from "@/lib/types";

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-tint">
      <span className="block h-full rounded-full" style={{ width: `${width}%`, background: color }} />
    </span>
  );
}

function countBy<T extends string>(items: T[]): Record<T, number> {
  const out = {} as Record<T, number>;
  for (const item of items) out[item] = (out[item] ?? 0) + 1;
  return out;
}

export default function AnalyticsPage() {
  const { leads, settings } = useLeadStore();

  if (leads.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="Cijfers" description="Conversie, branches en geschatte waarde uit je eigen leads." />
        <Card>
          <EmptyState icon={<ChartColumn className="size-5" />} title="Nog geen cijfers" description="Zoek leads en bewaar er een paar. Deze pagina gebruikt alleen jouw gegevens." />
        </Card>
      </PageContainer>
    );
  }

  const statusCounts = countBy(leads.map((l) => l.crm.status));
  const websiteCounts = countBy(leads.map((l) => l.websiteStatus));
  const contacted = leads.filter((l) => CONTACTED_STATUSES.includes(l.crm.status)).length;
  const won = leads.filter((l) => l.crm.status === "won").length;
  const lost = leads.filter((l) => l.crm.status === "lost").length;
  const closed = won + lost;
  const winRate = closed === 0 ? null : Math.round((won / closed) * 100);
  const contactRate = leads.length === 0 ? 0 : Math.round((contacted / leads.length) * 100);
  const pipelineValue = leads
    .filter((l) => l.crm.status !== "lost" && l.crm.status !== "won" && (l.crm.starred || CONTACTED_STATUSES.includes(l.crm.status)))
    .reduce((sum, l) => sum + estimatedProjectValue(l, settings.projectValues), 0);
  const wonValue = leads.filter((l) => l.crm.status === "won").reduce((sum, l) => sum + estimatedProjectValue(l, settings.projectValues), 0);

  const industries = Object.entries(
    leads.reduce<Record<string, { count: number; hot: number; value: number }>>((acc, l) => {
      const key = l.business.industry;
      const cur = acc[key] ?? { count: 0, hot: 0, value: 0 };
      cur.count += 1;
      if (l.score.tier === "hot") cur.hot += 1;
      if (l.crm.status !== "lost") cur.value += estimatedProjectValue(l, settings.projectValues);
      acc[key] = cur;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].count - a[1].count);

  const cities = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      const key = `${l.business.city}, ${l.business.countryCode}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const maxStatus = Math.max(...LEAD_STATUSES.map((s) => statusCounts[s.value] ?? 0), 1);
  const maxWebsite = Math.max(...Object.values(websiteCounts), 1);
  const maxIndustry = Math.max(...industries.map(([, v]) => v.count), 1);
  const maxCity = Math.max(...cities.map(([, n]) => n), 1);

  const tiers = {
    hot: leads.filter((l) => l.score.tier === "hot").length,
    warm: leads.filter((l) => l.score.tier === "warm").length,
    low: leads.filter((l) => l.score.tier === "low").length,
  };

  return (
    <PageContainer>
      <PageHeader title="Cijfers" description={`${formatNumber(leads.length)} leads. Omzet is een schatting per branche.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted">Benaderd</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{contactRate}%</p>
          <p className="mt-1 text-xs text-subtle">{formatNumber(contacted)} van {formatNumber(leads.length)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Winstkans</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{winRate === null ? "–" : `${winRate}%`}</p>
          <p className="mt-1 text-xs text-subtle">{winRate === null ? "Nog geen gewonnen of verloren deals" : `${won} gewonnen / ${lost} verloren`}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Pipeline</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{formatCurrency(pipelineValue)}</p>
          <p className="mt-1 text-xs text-subtle">Schatting · alleen lopende leads</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Gewonnen</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{formatCurrency(wonValue)}</p>
          <p className="mt-1 text-xs text-subtle">Schatting · afgesloten deals</p>
        </Card>
      </div>

      <div className="mt-6">
        <ActivityChart leads={leads} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pipeline" description="Leads per status." />
          <ul className="space-y-3 p-5">
            {LEAD_STATUSES.map((s) => {
              const n = statusCounts[s.value as LeadStatus] ?? 0;
              return (
                <li key={s.value} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-muted">{s.label}</span>
                  <Bar value={n} max={maxStatus} color="#8b5cf6" />
                  <span className="w-8 text-right tabular-nums text-fg">{n}</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Website" description="Hoe groot de kans is." />
          <ul className="space-y-3 p-5">
            {(Object.keys(WEBSITE_STATUS_LABEL) as WebsiteStatus[]).map((key) => {
              const n = websiteCounts[key] ?? 0;
              return (
                <li key={key} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-muted">{WEBSITE_STATUS_LABEL[key]}</span>
                  <Bar value={n} max={maxWebsite} color={key === "none" ? "#f97366" : key === "good" ? "#34d399" : "#f5a524"} />
                  <span className="w-8 text-right tabular-nums text-fg">{n}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-4 border-t border-line px-5 py-3 text-xs text-subtle">
            <span>Heet {tiers.hot}</span>
            <span>Warm {tiers.warm}</span>
            <span>Laag {tiers.low}</span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Branches" description="Waar de meeste leads zitten." />
          <ul className="divide-y divide-line">
            {industries.map(([name, v]) => (
              <li key={name} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-muted">{industryLabel(name)}</span>
                <span className={cn("w-16", "text-right text-xs text-subtle")}>{v.hot} heet</span>
                <span className="w-10 text-right tabular-nums">{v.count}</span>
                <span className="hidden w-20 text-right text-xs text-subtle sm:block">{formatCurrency(v.value)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Plaatsen" description="Waar je leads zitten." />
          <ul className="space-y-3 p-5">
            {cities.map(([name, n]) => (
              <li key={name} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 truncate text-muted">{name}</span>
                <Bar value={n} max={maxCity} color="#60a5fa" />
                <span className="w-8 text-right tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageContainer>
  );
}
