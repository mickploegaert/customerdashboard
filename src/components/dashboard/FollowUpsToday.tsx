"use client";

import Link from "next/link";
import { CalendarCheck, Check } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FOLLOW_UP_LABEL } from "@/lib/constants";
import { isSameDay } from "@/lib/format";
import { useLeadStore } from "@/lib/store/LeadStore";
import type { FollowUpType, Lead } from "@/lib/types";

const TONE: Record<FollowUpType, BadgeTone> = { call: "info", email: "accent", follow_up: "warm", meeting: "success" };

export function FollowUpsToday({ leads }: { leads: Lead[] }) {
  const { completeFollowUp } = useLeadStore();
  const now = new Date();
  const items = leads.flatMap((lead) =>
    lead.crm.followUps
      .filter((f) => !f.done && (isSameDay(new Date(f.dueAt), now) || new Date(f.dueAt) < now))
      .map((f) => ({ lead, followUp: f, overdue: !isSameDay(new Date(f.dueAt), now) })),
  );

  return (
    <Card>
      <CardHeader title="Vandaag opvolgen" description={items.length === 1 ? "1 taak" : `${items.length} taken`} />
      {items.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="size-5" />} title="Niets voor vandaag" description="Opvolgingen die je bij een lead zet, komen hier." />
      ) : (
        <ul className="divide-y divide-line px-2 py-1">
          {items.map(({ lead, followUp, overdue }) => (
            <li key={followUp.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <Link href={`/leads/${lead.business.id}`} className="min-w-0 flex-1 hover:underline">
                <span className="block truncate text-sm font-medium">{lead.business.name}</span>
                <span className="text-xs text-subtle">{lead.business.city}</span>
              </Link>
              {overdue && <Badge tone="danger">Te laat</Badge>}
              <Badge tone={TONE[followUp.type]}>{FOLLOW_UP_LABEL[followUp.type]}</Badge>
              <button
                onClick={() => completeFollowUp(lead.business.id, followUp.id)}
                className="rounded-md border border-line-strong p-1 text-subtle transition-colors hover:border-success/50 hover:text-success"
                aria-label="Klaar"
              >
                <Check className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
