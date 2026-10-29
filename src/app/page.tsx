"use client";

import { ArrowRight, Euro, Flame, Inbox, Search, Send, Star, Trophy, Users } from "lucide-react";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { FollowUpsToday } from "@/components/dashboard/FollowUpsToday";
import { RecommendedLeads } from "@/components/dashboard/RecommendedLeads";
import { MiniStats, StatCard } from "@/components/dashboard/StatCard";
import { PageContainer } from "@/components/layout/AppShell";
import { LeadTable } from "@/components/leads/LeadTable";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CONTACTED_STATUSES } from "@/lib/constants";
import { formatCurrency, formatNumber, greetingForHour } from "@/lib/format";
import { estimatedProjectValue } from "@/lib/leads";
import { useLeadStore } from "@/lib/store/LeadStore";

export default function DashboardPage() {
  const { leads, settings } = useLeadStore();

  // All numbers are calculated from your stored leads.
  const contacted = leads.filter((l) => CONTACTED_STATUSES.includes(l.crm.status)).length;
  const hot = leads.filter((l) => l.score.tier === "hot").length;
  const won = leads.filter((l) => l.crm.status === "won");
  // Potential revenue = estimated project value of all active (saved / in pipeline) leads.
  const revenue = leads
    .filter((l) => l.crm.status !== "lost" && l.crm.status !== "won" && (l.crm.starred || CONTACTED_STATUSES.includes(l.crm.status)))
    .reduce((sum, l) => sum + estimatedProjectValue(l, settings.projectValues), 0);

  const hotLeads = [...leads].sort((a, b) => b.score.total - a.score.total).slice(0, 8);

  return (
    <PageContainer>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greetingForHour(new Date().getHours())}
            {settings.userName ? `, ${settings.userName}` : ""}
          </h1>
          <p className="mt-1.5 text-sm text-muted">Dit staat er vandaag open.</p>
        </div>
        <ButtonLink href="/search" variant="primary" icon={<Search className="size-4" />}>
          Nieuwe leads zoeken
        </ButtonLink>
      </div>

      {leads.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="size-5" />}
            title="Nog geen leads"
            description="Zoek een plaats en een branche. Daarna kun je websites bekijken en leads bewaren."
            action={<ButtonLink href="/search" variant="primary">Begin met zoeken</ButtonLink>}
          />
        </Card>
      ) : (
        <>
          {/* Key numbers */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Leads" value={formatNumber(leads.length)} icon={<Users className="size-5" />} />
            <StatCard label="Heet" value={formatNumber(hot)} icon={<Flame className="size-5" />} tone="hot" sub={`Score ${settings.scoring.hotThreshold}+`} />
            <StatCard label="Benaderd" value={formatNumber(contacted)} icon={<Send className="size-5" />} tone="accent" />
            <StatCard
              label="Geschatte omzet"
              value={formatCurrency(revenue)}
              icon={<Euro className="size-5" />}
              tone="success"
              hint="Schatting op basis van branche, alleen voor bewaarde en lopende leads. Aanpassen bij Instellingen."
            />
          </section>
          <div className="mt-4">
            <MiniStats
              items={[
                { label: "Nieuw", value: formatNumber(leads.filter((l) => l.crm.status === "new").length), icon: <Inbox className="size-4" /> },
                { label: "Bewaard", value: formatNumber(leads.filter((l) => l.crm.starred).length), icon: <Star className="size-4" /> },
                { label: "Gewonnen", value: formatNumber(won.length), icon: <Trophy className="size-4" /> },
              ]}
            />
          </div>

          {/* Today */}
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <RecommendedLeads leads={leads} />
            <FollowUpsToday leads={leads} />
          </section>

          {/* Trends + best leads */}
          <section className="mt-8 space-y-6">
            <ActivityChart leads={leads} />
            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <Flame className="size-4 text-hot" /> Beste leads
                  </span>
                }
                description="De hoogste scores in je lijst."
                action={
                  <ButtonLink href="/leads" variant="ghost" size="sm">
                    Alles <ArrowRight className="size-3.5" />
                  </ButtonLink>
                }
              />
              <LeadTable leads={hotLeads} />
            </Card>
          </section>
        </>
      )}
    </PageContainer>
  );
}
