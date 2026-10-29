"use client";

import { Select } from "@/components/ui/Select";
import { LEAD_STATUSES } from "@/lib/constants";
import { useLeadStore } from "@/lib/store/LeadStore";
import type { LeadStatus } from "@/lib/types";

export function StatusSelect({ id, status, className }: { id: string; status: LeadStatus; className?: string }) {
  const { setStatus } = useLeadStore();
  return (
    <Select
      aria-label="Status"
      className={className}
      value={status}
      onChange={(e) => setStatus(id, e.target.value as LeadStatus)}
      options={LEAD_STATUSES}
    />
  );
}
