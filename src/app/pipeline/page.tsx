"use client";

import Link from "next/link";
import { GripVertical } from "lucide-react";
import { useState, type DragEvent } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { LeadScoreBadge } from "@/components/leads/LeadBadges";
import { StatusSelect } from "@/components/leads/StatusSelect";
import { PageHeader } from "@/components/ui/PageHeader";
import { industryLabel, LEAD_STATUSES } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/format";
import { estimatedProjectValue } from "@/lib/leads";
import { useLeadStore } from "@/lib/store/LeadStore";
import type { LeadStatus } from "@/lib/types";

const COLUMN_ACCENT: Partial<Record<LeadStatus, string>> = {
  won: "bg-success",
  lost: "bg-low",
  proposal: "bg-accent",
  meeting: "bg-accent",
  follow_up: "bg-warm",
  contacted: "bg-info",
};

/**
 * Kanban pipeline. Uses native HTML5 drag & drop (desktop).
 * On touch devices, use the status dropdown on each card.
 * "New" leads are not shown as a column to keep the board focused.
 */
export default function PipelinePage() {
  const { leads, setStatus } = useLeadStore();
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null);
  const columns = LEAD_STATUSES.filter((s) => s.value !== "new");

  function onDrop(e: DragEvent, status: LeadStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/lead-id");
    if (id) setStatus(id, status);
    setDragOver(null);
  }

  return (
    <PageContainer wide>
      <PageHeader title="Pipeline" description="Sleep een lead naar een andere kolom. Op je telefoon gebruik je het statusmenu op de kaart." />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const items = leads.filter((l) => l.crm.status === col.value).sort((a, b) => b.score.total - a.score.total);
          const value = items.reduce((s, l) => s + estimatedProjectValue(l), 0);
          return (
            <div
              key={col.value}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col.value);
              }}
              onDragLeave={() => setDragOver((v) => (v === col.value ? null : v))}
              onDrop={(e) => onDrop(e, col.value)}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-xl border bg-surface transition-colors",
                dragOver === col.value ? "border-accent/60 bg-accent-soft" : "border-line",
              )}
            >
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className={cn("size-2 rounded-full", COLUMN_ACCENT[col.value] ?? "bg-subtle")} />
                  {col.label}
                  <span className="text-xs font-normal text-subtle">{items.length}</span>
                </span>
                {value > 0 && <span className="text-[11px] text-subtle tabular-nums">~{formatCurrency(value)}</span>}
              </div>
              <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
                {items.map((lead) => (
                  <div
                    key={lead.business.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/lead-id", lead.business.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="group cursor-grab rounded-lg border border-line-strong bg-elevated p-3 transition-colors hover:border-accent/40 active:cursor-grabbing"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 size-4 shrink-0 text-subtle" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/leads/${lead.business.id}`} className="block truncate text-sm font-medium hover:text-accent-text">
                          {lead.business.name}
                        </Link>
                        <p className="truncate text-xs text-subtle">
                          {industryLabel(lead.business.industry)} · {lead.business.city}
                        </p>
                      </div>
                      <LeadScoreBadge score={lead.score} size="sm" />
                    </div>
                    <StatusSelect id={lead.business.id} status={lead.crm.status} className="mt-2 md:hidden" />
                  </div>
                ))}
                {items.length === 0 && <p className="py-6 text-center text-xs text-subtle">Drop leads here</p>}
              </div>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
