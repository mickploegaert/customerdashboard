"use client";

import { Copy, LoaderCircle, Mail, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format";
import { useLeadStore } from "@/lib/store/LeadStore";
import { useIntegrationStatus } from "@/lib/useStatus";
import type { Lead, LeadAiAnalysis } from "@/lib/types";

function factsFromLead(lead: Lead, senderName: string, senderCompany: string) {
  const b = lead.business;
  const verifiedFails = (lead.audit?.categories ?? [])
    .flatMap((c) => c.checks)
    .filter((c) => c.basis === "verified" && c.status === "fail")
    .map((c) => c.label);
  return {
    name: b.name,
    industry: b.industry,
    city: b.city,
    country: b.country,
    rating: b.rating,
    reviewCount: b.reviewCount,
    hasWebsite: Boolean(b.website),
    websiteAnalyzed: Boolean(lead.audit),
    websiteScore: lead.audit?.score ?? null,
    websiteProblems: lead.audit?.problems ?? [],
    verifiedChecksFailed: verifiedFails,
    openingHoursKnown: b.openingHours.length > 0,
    socialMedia: Object.keys(b.socials).filter((k) => Boolean(b.socials[k as keyof typeof b.socials])),
    description: b.description,
    leadScore: lead.score.total,
    scoreReasons: lead.score.factors.map((f) => `${f.points >= 0 ? "+" : ""}${f.points} ${f.label}`),
    senderName,
    senderCompany,
    language: ["NL", "BE"].includes(b.countryCode) || /netherlands|nederland|belgium|belgi[eë]/i.test(b.country) ? "nl" : "en",
  };
}

function AnalysisBody({ analysis }: { analysis: LeadAiAnalysis }) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    if (!analysis.email) return;
    const text = `${analysis.email.subject}\n\n${analysis.email.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-5">
      <section>
        <h4 className="text-xs font-semibold tracking-wide text-subtle uppercase">Waarom bellen?</h4>
        <p className="mt-1.5 text-sm leading-relaxed text-muted whitespace-pre-wrap">{analysis.whyContact}</p>
      </section>
      <section>
        <h4 className="text-xs font-semibold tracking-wide text-subtle uppercase">Wat kun je aanbieden?</h4>
        {analysis.whatToSell.length === 0 ? (
          <p className="mt-1.5 text-sm text-subtle">Onbekend</p>
        ) : (
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted">
            {analysis.whatToSell.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h4 className="text-xs font-semibold tracking-wide text-subtle uppercase">Pitch</h4>
        <p className="mt-1.5 text-sm leading-relaxed text-muted whitespace-pre-wrap">{analysis.suggestedPitch}</p>
      </section>
      {analysis.email && (
        <section className="rounded-lg border border-line bg-canvas p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-subtle uppercase">
              <Mail className="size-3.5" /> Conceptmail
            </h4>
            <Button size="sm" variant="ghost" icon={<Copy className="size-3.5" />} onClick={copyEmail}>
              {copied ? "Gekopieerd" : "Kopiëren"}
            </Button>
          </div>
          <p className="text-sm font-medium">{analysis.email.subject}</p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-muted">{analysis.email.body}</p>
        </section>
      )}
      <p className="text-[11px] text-subtle">
        Gemaakt {formatDateTime(analysis.generatedAt)} · {analysis.model}. Alleen uit bekende feiten. Wat ontbreekt staat als onbekend.
      </p>
    </div>
  );
}

export function AiAnalysis({ lead }: { lead: Lead }) {
  const { settings, saveAiAnalysis } = useLeadStore();
  const status = useIntegrationStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connected = status?.ai === true;
  const fromFacts = status?.aiProvider === "facts";
  const analysis = lead.crm.aiAnalysis;

  async function run(includeEmail: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeEmail,
          facts: factsFromLead(lead, settings.userName, settings.companyName),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      saveAiAnalysis(lead.business.id, data.analysis as LeadAiAnalysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyse mislukt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent-text" /> Leadtekst
            {connected ? (
              <Badge tone={fromFacts ? "accent" : "success"}>{fromFacts ? "Uit bekende feiten" : "OpenAI"}</Badge>
            ) : (
              <Badge tone="warm">Niet gekoppeld</Badge>
            )}
          </span>
        }
        description={
          fromFacts
            ? "Geschreven uit gegevens die we al hebben. Geen AI-sleutel. Ontbrekende info blijft onbekend."
            : "Waarom bellen, wat je kunt aanbieden en een korte pitch. Verzint geen feiten."
        }
      />
      <div className="p-5">
        {!connected ? (
          <p className="text-sm text-subtle">
            Zet <code className="text-muted">OPENAI_API_KEY</code> in <code className="text-muted">.env.local</code> voor ChatGPT-teksten. Tot die tijd blijft dit uit.
          </p>
        ) : (
          <>
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-warm/30 bg-warm/10 px-3 py-2 text-sm text-warm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {error}
              </div>
            )}
            {analysis && <AnalysisBody analysis={analysis} />}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={loading}
                onClick={() => run(false)}
                icon={loading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              >
                {analysis ? "Opnieuw" : "Tekst maken"}
              </Button>
              <Button size="sm" disabled={loading} onClick={() => run(true)} icon={<Mail className="size-3.5" />}>
                Tekst + mail
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
