"use client";

import { History, Play } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import { summarizeFilters } from "@/lib/search";
import type { SearchFilters, SearchHistoryEntry } from "@/lib/types";

export function SearchHistory({
  entries,
  onRun,
}: {
  entries: SearchHistoryEntry[];
  onRun: (filters: SearchFilters) => void;
}) {
  return (
    <Card>
      <CardHeader title="Eerder gezocht" description="Klik om dezelfde zoekopdracht opnieuw te doen." />
      {entries.length === 0 ? (
        <EmptyState icon={<History className="size-5" />} title="Nog niet gezocht" description="Je zoekopdrachten komen hier te staan." />
      ) : (
        <ul className="divide-y divide-line">
          {entries.slice(0, 12).map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onRun(entry.filters)}
                className="group flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-hover"
              >
                <Play className="mt-0.5 size-3.5 shrink-0 text-subtle group-hover:text-accent-text" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-fg">{summarizeFilters(entry.filters)}</span>
                  <span className="mt-0.5 block text-xs text-subtle">
                    {entry.resultCount} resultaat{entry.resultCount === 1 ? "" : "en"} · {formatDateTime(entry.createdAt)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
