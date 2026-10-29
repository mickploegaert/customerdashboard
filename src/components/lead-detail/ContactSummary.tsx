"use client";

import { Check, Send } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CONTACT_CHANNELS, FOLLOW_UP_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { lastContactedAt, nextFollowUp, useLeadStore } from "@/lib/store/LeadStore";
import type { Lead } from "@/lib/types";

const channelLabel = (value: string) => CONTACT_CHANNELS.find((c) => c.value === value)?.label ?? value;

export function ContactSummary({ lead, onContact }: { lead: Lead; onContact: () => void }) {
  const { completeFollowUp } = useLeadStore();
  const last = lastContactedAt(lead);
  const next = nextFollowUp(lead);

  return (
    <Card>
      <CardHeader
        title="Contact en opvolging"
        action={
          <Button size="sm" icon={<Send className="size-3.5" />} onClick={onContact}>
            Contact loggen
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 p-5 pb-3">
        <div className="rounded-lg border border-line bg-canvas px-3 py-2.5">
          <div className="text-[11px] text-subtle">Laatst contact</div>
          <div className="mt-0.5 text-sm font-medium">{last ? formatDate(last) : "Nog niet"}</div>
        </div>
        <div className="rounded-lg border border-line bg-canvas px-3 py-2.5">
          <div className="text-[11px] text-subtle">Volgende opvolging</div>
          <div className="mt-0.5 flex items-center justify-between gap-2 text-sm font-medium">
            {next ? formatDate(next.dueAt) : "Geen"}
            {next && (
              <button onClick={() => completeFollowUp(lead.business.id, next.id)} className="text-subtle hover:text-success" aria-label="Opvolging afvinken">
                <Check className="size-3.5" />
              </button>
            )}
          </div>
          {next && <div className="text-[11px] text-subtle">{FOLLOW_UP_LABEL[next.type]}</div>}
        </div>
      </div>
      {lead.crm.contacts.length > 0 && (
        <ul className="space-y-2 px-5 pb-5">
          {lead.crm.contacts.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              <Badge tone="info">{channelLabel(c.channel)}</Badge>
              <span className="min-w-0 flex-1">
                <span className="text-muted">{c.note || "Geen notitie"}</span>
                <span className="block text-[11px] text-subtle">{formatDate(c.contactedAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
