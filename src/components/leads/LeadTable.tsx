"use client";

import { useRouter } from "next/navigation";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { industryLabel } from "@/lib/constants";
import { websiteDomain } from "@/lib/leads";
import type { Lead } from "@/lib/types";
import { LeadScoreBadge, Rating, ScoreBar, StatusBadge, WebsiteStatusBadge } from "./LeadBadges";
import { StarButton } from "./StarButton";

/**
 * The standard lead table:
 * Business · Industry · Location · Rating · Reviews · Website · Website Score · Lead Score · Status
 */
export function LeadTable({
  leads,
  selectable,
  selected,
  onToggleSelect,
  onToggleAll,
}: {
  leads: Lead[];
  selectable?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleAll?: () => void;
}) {
  const router = useRouter();
  const allSelected = selectable && leads.length > 0 && leads.every((l) => selected?.has(l.business.id));

  return (
    <Table>
      <thead>
        <tr>
          {selectable && (
            <Th className="w-10 pr-0">
              <input type="checkbox" aria-label="Alles selecteren" checked={Boolean(allSelected)} onChange={onToggleAll} className="accent-violet-500" />
            </Th>
          )}
          <Th>Bedrijf</Th>
          <Th>Branche</Th>
          <Th>Plaats</Th>
          <Th>Score</Th>
          <Th>Website</Th>
          <Th>Site</Th>
          <Th>Lead</Th>
          <Th>Status</Th>
          <Th className="w-10" />
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => {
          const b = lead.business;
          return (
            <Tr key={b.id} className="cursor-pointer" onClick={() => router.push(`/leads/${b.id}`)}>
              {selectable && (
                <Td className="pr-0" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${b.name}`}
                    checked={selected?.has(b.id) ?? false}
                    onChange={() => onToggleSelect?.(b.id)}
                    className="accent-violet-500"
                  />
                </Td>
              )}
              <Td>
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-elevated text-xs font-semibold text-muted">
                    {b.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0">
                    <span className="block max-w-[220px] truncate font-medium text-fg">{b.name}</span>
                    {b.website && <span className="block max-w-[220px] truncate text-xs text-subtle">{websiteDomain(b.website)}</span>}
                  </span>
                </div>
              </Td>
              <Td>{industryLabel(b.industry)}</Td>
              <Td>
                {b.city}, <span className="text-subtle">{b.countryCode}</span>
              </Td>
              <Td>
                <Rating rating={b.rating} reviews={b.reviewCount} />
              </Td>
              <Td>
                <WebsiteStatusBadge status={lead.websiteStatus} />
              </Td>
              <Td>
                <ScoreBar value={lead.audit?.score ?? null} />
              </Td>
              <Td>
                <LeadScoreBadge score={lead.score} size="sm" />
              </Td>
              <Td>
                <StatusBadge status={lead.crm.status} />
              </Td>
              <Td className="pl-0">
                <StarButton id={b.id} starred={lead.crm.starred} />
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
