"use client";

import { ChevronDown, Columns2, Database, LayoutGrid, List, LoaderCircle, RotateCcw, Search, SearchX, TriangleAlert } from "lucide-react";
import { SearchHistory } from "@/components/search/SearchHistory";
import { useIntegrationStatus } from "@/lib/useStatus";
import { useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { LeadCard } from "@/components/leads/LeadCard";
import { LeadTable } from "@/components/leads/LeadTable";
import { LeadMap, MapLegend } from "@/components/map/LeadMap";
import { SearchFiltersPanel } from "@/components/search/SearchFiltersPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/format";
import { DEFAULT_FILTERS } from "@/lib/search";
import { useLeadStore } from "@/lib/store/LeadStore";
import type { Lead, SearchFilters, SearchResponse } from "@/lib/types";

type View = "split" | "cards" | "table";

export default function SearchPage() {
  const { settings, addSearchResults, getLead, searches } = useLeadStore();
  const status = useIntegrationStatus();
  const initialFilters: SearchFilters = {
    ...DEFAULT_FILTERS,
    radiusKm: settings.defaultRadiusKm,
    minRating: settings.defaultMinRating,
    minReviews: settings.defaultMinReviews,
  };

  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<Omit<SearchResponse, "businesses" | "audits"> | null>(null);
  const [resultIds, setResultIds] = useState<string[]>([]);
  const [view, setView] = useState<View>("split");
  const [sort, setSort] = useState<"score" | "reviews" | "rating">("score");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Results are read from the store so star/status changes show up immediately.
  const results = useMemo(() => {
    const list = resultIds.map((id) => getLead(id)).filter((l): l is Lead => Boolean(l));
    const sorters = {
      score: (a: Lead, b: Lead) => b.score.total - a.score.total,
      reviews: (a: Lead, b: Lead) => b.business.reviewCount - a.business.reviewCount,
      rating: (a: Lead, b: Lead) => (b.business.rating ?? 0) - (a.business.rating ?? 0),
    };
    return list.sort(sorters[sort]);
  }, [resultIds, getLead, sort]);

  async function runSearch(searchFilters: SearchFilters = filters) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchFilters),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      const result = data as SearchResponse;
      setResultIds(await addSearchResults(searchFilters, result));
      const { businesses: _b, audits: _a, ...meta } = result;
      setResponse(meta);
      setSelectedId(null);
      setFiltersOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function selectFromMap(id: string) {
    setSelectedId(id);
    // Scroll the matching card into view in the list.
    document.getElementById(`result-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  const activeFilterCount =
    [filters.country, filters.region, filters.city].filter(Boolean).length +
    filters.industries.length +
    filters.websiteIssues.length +
    filters.sizes.length +
    filters.spending.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.minReviews > 0 ? 1 : 0) +
    (filters.minLeadScore > 0 ? 1 : 0);

  return (
    <PageContainer>
      <PageHeader
        title="Leads zoeken"
        description="Kies een plaats en een branche. Daarna bekijk je per lead de website."
        actions={
          <Badge tone="accent" icon={<Database className="size-3" />}>
            {!status
              ? "Source: …"
              : status.demo
                ? "Bron: demo"
                : status.geoapify
                  ? "Bron: Geoapify"
                  : status.googlePlaces
                    ? "Bron: Google Places"
                    : status.openStreetMap
                      ? "Bron: OpenStreetMap"
                      : "Zoeken niet gekoppeld"}
          </Badge>
        }
      />

      {/* ---------------- Filters ---------------- */}
      <Card className="mb-6">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
          aria-expanded={filtersOpen}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            Filters
            {activeFilterCount > 0 && <Badge tone="accent">{activeFilterCount} aan</Badge>}
          </span>
          <ChevronDown className={cn("size-4 text-subtle transition-transform", filtersOpen && "rotate-180")} />
        </button>
        {filtersOpen && (
          <div className="border-t border-line p-4 sm:p-5">
            <SearchFiltersPanel filters={filters} onChange={setFilters} showEstimates={Boolean(status?.googlePlaces)} />
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-subtle">
            {status?.demo
              ? "Demo zoekt in 30 verzonnen bedrijven."
              : status?.googlePlaces
                ? "Zoekt in Google Places. Website-score komt na een analyse."
                : "Echte bedrijven. Geen sterren of reviews in deze bron. Website-score komt na een analyse."}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => setFilters(initialFilters)}>
              Wissen
            </Button>
            <Button variant="primary" icon={loading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />} onClick={() => runSearch()} disabled={loading}>
              {loading ? "Zoeken…" : "Zoeken"}
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <TriangleAlert className="size-4" /> {error}
        </div>
      )}

      {/* ---------------- Results ---------------- */}
      {!response ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Card>
            <EmptyState
              icon={<Search className="size-5" />}
              title="Nog niet gezocht"
              description={
                status?.demo
                  ? "Kies een plaats en een branche, en druk op Zoeken."
                  : "Kies bijvoorbeeld Amsterdam en een branche, en druk op Zoeken."
              }
            />
          </Card>
          <SearchHistory
            entries={searches}
            onRun={(f) => {
              setFilters(f);
              void runSearch(f);
            }}
          />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">
                {results.length} resultaat{results.length === 1 ? "" : "en"}
              </h2>
              <Badge tone="neutral">{response.providerLabel}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Select
                aria-label="Sorteren"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                options={[
                  { value: "score", label: "Leadscore" },
                  { value: "reviews", label: "Reviews" },
                  { value: "rating", label: "Score" },
                ]}
                className="w-36"
              />
              <Tabs
                value={view}
                onChange={setView}
                items={[
                  { value: "split", label: <span className="hidden sm:inline">Kaart</span>, icon: <Columns2 className="size-4" /> },
                  { value: "cards", label: <span className="hidden sm:inline">Tegels</span>, icon: <LayoutGrid className="size-4" /> },
                  { value: "table", label: <span className="hidden sm:inline">Lijst</span>, icon: <List className="size-4" /> },
                ]}
              />
            </div>
          </div>

          {response.notice && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-warm/30 bg-warm/10 px-4 py-3 text-sm text-warm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {response.notice}
            </div>
          )}

          {results.length === 0 ? (
            <Card>
              <EmptyState icon={<SearchX className="size-5" />} title="Niets gevonden" description="Vergroot de straal of kies minder branches." />
            </Card>
          ) : view === "split" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
              <div className="order-2 space-y-2 lg:order-1 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-1">
                {results.map((lead) => (
                  <div key={lead.business.id} id={`result-${lead.business.id}`}>
                    <LeadCard lead={lead} selected={lead.business.id === selectedId} onSelect={() => setSelectedId(lead.business.id)} />
                  </div>
                ))}
              </div>
              <Card className="order-1 overflow-hidden lg:sticky lg:top-20 lg:order-2 lg:h-[calc(100vh-180px)]">
                <LeadMap leads={results} selectedId={selectedId} onSelect={selectFromMap} className="h-[360px] w-full lg:h-[calc(100%-44px)]" />
                <MapLegend className="border-t border-line px-4 py-3" />
              </Card>
            </div>
          ) : view === "cards" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((lead) => (
                <LeadCard key={lead.business.id} lead={lead} />
              ))}
            </div>
          ) : (
            <Card>
              <LeadTable leads={results} />
            </Card>
          )}

          {searches.length > 0 && (
            <div className="mt-8 max-w-xl">
              <SearchHistory
                entries={searches}
                onRun={(f) => {
                  setFilters(f);
                  void runSearch(f);
                }}
              />
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
