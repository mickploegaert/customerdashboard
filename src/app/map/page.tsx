"use client";

import { Flame, Globe, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { LeadMap, MapLegend } from "@/components/map/LeadMap";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { industryLabel, LEAD_STATUSES, WEBSITE_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/format";
import { dataMode } from "@/lib/config";
import { useLeadStore } from "@/lib/store/LeadStore";

interface MapFilters {
  minScore: number;
  industry: string;
  website: string;
  minRating: number;
  minReviews: number;
  status: string;
  hotOnly: boolean;
  noWebsiteOnly: boolean;
}

const DEFAULTS: MapFilters = {
  minScore: 0,
  industry: "all",
  website: "all",
  minRating: 0,
  minReviews: 0,
  status: "all",
  hotOnly: false,
  noWebsiteOnly: false,
};

export default function MapPage() {
  const { leads } = useLeadStore();
  const [filters, setFilters] = useState<MapFilters>(DEFAULTS);
  const [panelOpen, setPanelOpen] = useState(false);
  const set = <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));

  const industries = useMemo(() => [...new Set(leads.map((l) => l.business.industry))].sort(), [leads]);

  const visible = useMemo(
    () =>
      leads.filter((l) => {
        if (l.score.total < filters.minScore) return false;
        if (filters.industry !== "all" && l.business.industry !== filters.industry) return false;
        if (filters.website !== "all" && l.websiteStatus !== filters.website) return false;
        if (filters.minRating > 0 && l.business.rating !== null && l.business.rating < filters.minRating) return false;
        const reviewsKnown = l.business.source !== "openstreetmap" && l.business.source !== "geoapify";
        if (filters.minReviews > 0 && reviewsKnown && l.business.reviewCount < filters.minReviews) return false;
        if (filters.status !== "all" && l.crm.status !== filters.status) return false;
        if (filters.hotOnly && l.score.tier !== "hot") return false;
        if (filters.noWebsiteOnly && l.business.website) return false;
        return true;
      }),
    [leads, filters],
  );

  const panel = (
    <div className="space-y-4">
      <div className="space-y-1">
        <Checkbox label={<span className="inline-flex items-center gap-1.5"><Flame className="size-3.5 text-hot" /> Alleen hete leads</span>} checked={filters.hotOnly} onChange={(v) => set("hotOnly", v)} />
        <Checkbox label={<span className="inline-flex items-center gap-1.5"><Globe className="size-3.5 text-accent-text" /> Alleen zonder website</span>} checked={filters.noWebsiteOnly} onChange={(v) => set("noWebsiteOnly", v)} />
      </div>
      <div>
        <div className="mb-1.5 flex justify-between">
          <Label className="mb-0">Minimale leadscore</Label>
          <span className="text-xs tabular-nums">{filters.minScore}</span>
        </div>
        <input type="range" min={0} max={100} step={5} value={filters.minScore} onChange={(e) => set("minScore", Number(e.target.value))} className="w-full accent-violet-500" />
      </div>
      <div>
        <Label>Branche</Label>
        <Select value={filters.industry} onChange={(e) => set("industry", e.target.value)} options={[{ value: "all", label: "Alle branches" }, ...industries.map((i) => ({ value: i, label: industryLabel(i) }))]} />
      </div>
      <div>
        <Label>Website</Label>
        <Select
          value={filters.website}
          onChange={(e) => set("website", e.target.value)}
          options={[{ value: "all", label: "Alles" }, ...Object.entries(WEBSITE_STATUS_LABEL).map(([value, label]) => ({ value, label }))]}
        />
      </div>
      <div>
        <div className="mb-1.5 flex justify-between">
          <Label className="mb-0">Minimale score</Label>
          <span className="text-xs tabular-nums">⭐ {filters.minRating.toFixed(1)}</span>
        </div>
        <input type="range" min={0} max={5} step={0.1} value={filters.minRating} onChange={(e) => set("minRating", Number(e.target.value))} className="w-full accent-violet-500" />
      </div>
      <div>
        <Label>Minimaal aantal reviews</Label>
        <Input type="number" min={0} value={filters.minReviews} onChange={(e) => set("minReviews", Math.max(0, Number(e.target.value)))} />
      </div>
      <div>
        <Label>Status</Label>
        <Select value={filters.status} onChange={(e) => set("status", e.target.value)} options={[{ value: "all", label: "Alle statussen" }, ...LEAD_STATUSES]} />
      </div>
      <Button variant="ghost" size="sm" icon={<RotateCcw className="size-3.5" />} onClick={() => setFilters(DEFAULTS)} className="w-full">
        Filters wissen
      </Button>
    </div>
  );

  return (
    <div className="relative flex min-h-[480px] flex-1">
      {/* Filter panel: fixed column on desktop, overlay on mobile */}
      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-[500] w-72 overflow-y-auto border-r border-line bg-surface p-4 transition-transform lg:static lg:translate-x-0",
          panelOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-sm font-semibold">Kaart</h1>
          <button className="rounded-md p-1 text-subtle hover:text-fg lg:hidden" onClick={() => setPanelOpen(false)} aria-label="Filters sluiten">
            <X className="size-4" />
          </button>
        </div>
        {panel}
      </aside>

      <div className="relative flex-1">
        <LeadMap leads={visible} className="absolute inset-0 h-full w-full" />

        <div className="pointer-events-none absolute top-3 right-3 left-3 z-[400] flex items-start justify-between gap-2">
          <div className="pointer-events-auto flex items-center gap-2">
            <Button size="sm" className="lg:hidden" icon={<SlidersHorizontal className="size-3.5" />} onClick={() => setPanelOpen(true)}>
              Filters
            </Button>
            <span className="rounded-lg border border-line-strong bg-elevated/90 px-3 py-1.5 text-xs backdrop-blur">
              <span className="font-semibold tabular-nums">{visible.length}</span> <span className="text-subtle">van {leads.length}</span>
            </span>
            {dataMode === "demo" && <Badge tone="accent" className="hidden sm:inline-flex">Demo</Badge>}
          </div>
        </div>

        <div className="absolute bottom-6 left-3 z-[400] max-w-[calc(100%-24px)] rounded-lg border border-line-strong bg-elevated/90 px-3 py-2 backdrop-blur">
          <MapLegend />
        </div>
      </div>
    </div>
  );
}
