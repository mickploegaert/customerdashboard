"use client";

import { CircleAlert, CircleCheck, CircleHelp, CircleX, Globe, LoaderCircle, RefreshCw, ScanSearch, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn, formatDateTime } from "@/lib/format";
import { useLeadStore } from "@/lib/store/LeadStore";
import type { AuditCheck, CheckStatus, Lead, WebsiteAudit } from "@/lib/types";

const STATUS_ICON: Record<CheckStatus, { icon: typeof CircleCheck; className: string; label: string }> = {
  pass: { icon: CircleCheck, className: "text-success", label: "OK" },
  warn: { icon: CircleAlert, className: "text-warm", label: "Kan beter" },
  fail: { icon: CircleX, className: "text-hot", label: "Probleem" },
  unknown: { icon: CircleHelp, className: "text-subtle", label: "Niet te controleren" },
};

function scoreColor(score: number) {
  return score >= 70 ? "#34d399" : score >= 45 ? "#f5a524" : "#f97366";
}

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 80 80" className="size-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-line-strong)" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={scoreColor(score)} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">{score}</span>
        <span className="text-[10px] text-subtle">/100</span>
      </div>
    </div>
  );
}

function CheckList({ checks }: { checks: (AuditCheck & { category: string })[] }) {
  return (
    <ul className="space-y-1.5">
      {checks.map((c) => {
        const meta = STATUS_ICON[c.status];
        const Icon = meta.icon;
        return (
          <li key={`${c.category}-${c.label}`} className="flex items-start gap-2 text-sm">
            <Icon className={cn("mt-0.5 size-4 shrink-0", meta.className)} aria-label={meta.label} />
            <span className="min-w-0">
              <span className="text-muted">{c.label}</span>
              <span className="ml-1.5 text-[11px] text-subtle">{c.category}</span>
              {c.detail && <span className="block text-xs text-subtle">{c.detail}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function AuditResult({ audit }: { audit: WebsiteAudit }) {
  const all = audit.categories.flatMap((cat) => cat.checks.map((c) => ({ ...c, category: cat.label })));
  const verified = all.filter((c) => c.basis === "verified");
  const estimated = all.filter((c) => c.basis === "estimated");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ScoreRing score={audit.score} />
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-5">
          {audit.categories.map((cat) => (
            <div key={cat.key} className="rounded-lg border border-line bg-canvas px-3 py-2">
              <div className="text-[11px] text-subtle">{cat.label}</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums" style={{ color: scoreColor(cat.score) }}>
                {cat.score}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-hot/20 bg-hot/[0.04] p-4">
          <h4 className="mb-2 text-sm font-semibold">Gevonden problemen</h4>
          {audit.problems.length === 0 ? (
            <p className="text-sm text-subtle">Geen grote problemen gevonden.</p>
          ) : (
            <ul className="space-y-1.5">
              {audit.problems.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-muted">
                  <span aria-hidden>❌</span> {p}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-success/20 bg-success/[0.04] p-4">
          <h4 className="mb-2 text-sm font-semibold">Kansen</h4>
          {audit.opportunities.length === 0 ? (
            <p className="text-sm text-subtle">De site oogt in orde. Een kleine verbetering (SEO, boeken) kan nog steeds passen.</p>
          ) : (
            <ul className="space-y-1.5">
              {audit.opportunities.map((o) => (
                <li key={o} className="flex items-start gap-2 text-sm text-muted">
                  <span aria-hidden>✅</span> {o}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="mb-1 text-sm font-semibold">Gemeten</h4>
          <p className="mb-3 text-xs text-subtle">Rechtstreeks van de website afgelezen.</p>
          <CheckList checks={verified} />
        </div>
        <div>
          <h4 className="mb-1 text-sm font-semibold">Inschatting</h4>
          <p className="mb-3 text-xs text-subtle">Een indruk, geen meting. Gebruik het als aanwijzing.</p>
          <CheckList checks={estimated} />
        </div>
      </div>
    </div>
  );
}

export function WebsiteAnalysis({ lead, analyzeSignal }: { lead: Lead; analyzeSignal?: number }) {
  const { saveAudit } = useLeadStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSignal = useRef(analyzeSignal ?? 0);
  const b = lead.business;

  async function analyze() {
    if (!b.website) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: b.id, url: b.website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analyse mislukt");
      saveAudit(data.audit as WebsiteAudit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyse mislukt");
    } finally {
      setLoading(false);
    }
  }

  // The "Analyze Website" button in the header bumps `analyzeSignal`.
  useEffect(() => {
    if (analyzeSignal === undefined || analyzeSignal === lastSignal.current) return;
    lastSignal.current = analyzeSignal;
    void analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzeSignal]);

  const audit = lead.audit;

  return (
    <Card id="website-analysis">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Website
            {audit?.source === "demo" && <Badge tone="accent">Demo · verzonnen resultaat</Badge>}
          </span>
        }
        description={
          audit ? `Bekeken ${formatDateTime(audit.analyzedAt)} · ${audit.url}` : b.website ? b.website : "Dit bedrijf heeft geen website."
        }
        action={
          b.website && (
            <Button
              size="sm"
              variant={audit ? "secondary" : "primary"}
              onClick={analyze}
              disabled={loading}
              icon={loading ? <LoaderCircle className="size-3.5 animate-spin" /> : audit ? <RefreshCw className="size-3.5" /> : <ScanSearch className="size-3.5" />}
            >
              {loading ? "Bezig…" : audit ? "Opnieuw" : "Website bekijken"}
            </Button>
          )
        }
      />
      <div className="p-5">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-warm/30 bg-warm/10 px-3 py-2 text-sm text-warm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {error}
          </div>
        )}

        {!b.website ? (
          <div className="rounded-xl border border-hot/25 bg-hot/[0.05] p-5">
            <p className="text-sm font-semibold text-hot">Geen website gevonden</p>
            <p className="mt-1 text-sm text-muted">
              In de gegevens staat geen website. Dat is de sterkste kans: een nieuwe site waarop klanten direct contact kunnen opnemen.
            </p>
            <p className="mt-3 text-xs text-subtle">Zeker: geen website in deze gegevens. Niet zeker: of er ergens anders toch een site is.</p>
          </div>
        ) : audit ? (
          <AuditResult audit={audit} />
        ) : (
          <div className="rounded-xl border border-dashed border-line-strong p-6 text-center">
            <Globe className="mx-auto size-6 text-subtle" />
            <p className="mt-2 text-sm font-medium">Nog niet bekeken</p>
            <p className="mt-1 text-sm text-subtle">Bekijk design, mobiel, techniek, SEO en conversie.</p>
          </div>
        )}

        {/* Screenshot + redesign comparison */}
        {audit?.screenshotUrl && (
          <div className="mt-6">
            <h4 className="mb-2 text-sm font-semibold">Schermafbeelding (mobiel)</h4>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={audit.screenshotUrl} alt={`Schermafbeelding van ${b.name}`} className="max-h-80 w-full rounded-xl border border-line object-cover object-top" />
          </div>
        )}
      </div>
    </Card>
  );
}
