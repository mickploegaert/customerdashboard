"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, SearchX } from "lucide-react";
import { useState } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { BusinessInfo } from "@/components/lead-detail/BusinessInfo";
import { ContactModal } from "@/components/lead-detail/ContactModal";
import { ContactSummary } from "@/components/lead-detail/ContactSummary";
import { LeadHeader } from "@/components/lead-detail/LeadHeader";
import { NotesPanel } from "@/components/lead-detail/NotesPanel";
import { OpportunityCard } from "@/components/lead-detail/OpportunityCard";
import { WebsiteAnalysis } from "@/components/lead-detail/WebsiteAnalysis";
import { AiAnalysis } from "@/components/lead-detail/AiAnalysis";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLeadStore } from "@/lib/store/LeadStore";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getLead } = useLeadStore();
  const lead = getLead(id);
  const [contactOpen, setContactOpen] = useState(false);
  const [analyzeSignal, setAnalyzeSignal] = useState(0);

  if (!lead) {
    return (
      <PageContainer>
        <Card>
          <EmptyState
            icon={<SearchX className="size-5" />}
            title="Lead niet gevonden"
            description="Deze lead bestaat niet (meer)."
            action={<ButtonLink href="/leads">Naar leads</ButtonLink>}
          />
        </Card>
      </PageContainer>
    );
  }

  function analyze() {
    setAnalyzeSignal((n) => n + 1);
    document.getElementById("website-analysis")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <PageContainer>
      <Link href="/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-fg">
        <ArrowLeft className="size-4" /> Alle leads
      </Link>

      <LeadHeader lead={lead} onContact={() => setContactOpen(true)} onAnalyze={analyze} />

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <OpportunityCard lead={lead} />
          <WebsiteAnalysis lead={lead} analyzeSignal={analyzeSignal} />
          <NotesPanel lead={lead} />
        </div>
        <div className="space-y-6">
          <ContactSummary lead={lead} onContact={() => setContactOpen(true)} />
          <AiAnalysis lead={lead} />
          <BusinessInfo lead={lead} />
        </div>
      </div>

      <ContactModal lead={lead} open={contactOpen} onClose={() => setContactOpen(false)} />
    </PageContainer>
  );
}
