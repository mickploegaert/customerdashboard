"use client";

import { Building2, Globe, MapPin, Plus, Star, Target, Wallet, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Checkbox, Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { INDUSTRIES, SIZE_LABEL, SPENDING_LABEL } from "@/lib/constants";
import { cn } from "@/lib/format";
import type { BusinessSize, SearchFilters, SpendingPotential } from "@/lib/types";

const WEBSITE_FILTER_OPTIONS: { value: SearchFilters["websiteIssues"][number]; label: string }[] = [
  { value: "no_website", label: "Geen website" },
  { value: "outdated", label: "Oude website" },
  { value: "poor_mobile", label: "Slecht op mobiel" },
  { value: "slow", label: "Trage website" },
  { value: "poor_design", label: "Zwak design" },
  { value: "no_ssl", label: "Geen SSL" },
  { value: "broken", label: "Kapotte website" },
  { value: "poor_seo", label: "Zwakke SEO" },
  { value: "low_quality", label: "Website van lage kwaliteit" },
];

const DEMO_CITIES = ["Miami", "Fort Lauderdale", "Austin", "Toronto", "Amsterdam", "Rotterdam", "Utrecht", "London", "Manchester", "Berlin", "Munich", "Antwerp"];

function Section({ icon, title, children, className }: { icon: ReactNode; title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-canvas/40 p-4", className)}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
        <span className="text-accent-text">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs transition-colors",
        active ? "border-accent/50 bg-accent-soft text-accent-text" : "border-line-strong text-muted hover:border-line-strong hover:bg-hover hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function SearchFiltersPanel({
  filters,
  onChange,
  showEstimates = false,
}: {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  /** Google Places has ratings. Geoapify and OpenStreetMap do not, so those filters stay hidden. */
  showEstimates?: boolean;
}) {
  const [customIndustry, setCustomIndustry] = useState("");
  const set = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => onChange({ ...filters, [key]: value });

  const customIndustries = filters.industries.filter((i) => !INDUSTRIES.some((x) => x.name === i));

  function addCustomIndustry() {
    const value = customIndustry.trim().slice(0, 60);
    if (value && !filters.industries.includes(value)) set("industries", [...filters.industries, value]);
    setCustomIndustry("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {/* Location */}
      <Section icon={<MapPin className="size-3.5" />} title="Plaats">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="f-country">Land</Label>
            <Input id="f-country" placeholder="Nederland" value={filters.country} onChange={(e) => set("country", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="f-region">Regio</Label>
            <Input id="f-region" placeholder="Noord-Holland" value={filters.region} onChange={(e) => set("region", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="f-city">Plaats</Label>
            <Input id="f-city" list="demo-cities" placeholder="Amsterdam" value={filters.city} onChange={(e) => set("city", e.target.value)} />
            <datalist id="demo-cities">
              {DEMO_CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <Label htmlFor="f-radius">Straal</Label>
            <Select
              id="f-radius"
              value={String(filters.radiusKm)}
              onChange={(e) => set("radiusKm", Number(e.target.value))}
              options={[5, 10, 25, 50, 100, 200].map((km) => ({ value: String(km), label: `${km} km` }))}
            />
          </div>
        </div>
      </Section>

      {/* Industry */}
      <Section icon={<Building2 className="size-3.5" />} title="Branche" className="2xl:col-span-2">
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((i) => (
            <Chip key={i.name} active={filters.industries.includes(i.name)} onClick={() => set("industries", toggleIn(filters.industries, i.name))}>
              {i.label}
            </Chip>
          ))}
          {customIndustries.map((name) => (
            <Chip key={name} active onClick={() => set("industries", filters.industries.filter((x) => x !== name))}>
              {name} <X className="size-3" />
            </Chip>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addCustomIndustry();
          }}
        >
          <Input placeholder="Eigen branche, bijvoorbeeld zwembad" value={customIndustry} onChange={(e) => setCustomIndustry(e.target.value)} maxLength={60} />
          <button type="submit" className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-line-strong px-3 text-sm text-muted hover:bg-hover hover:text-fg">
            <Plus className="size-4" /> Toevoegen
          </button>
        </form>
      </Section>

      {showEstimates && (
      <Section icon={<Star className="size-3.5" />} title="Beoordeling">
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="f-rating" className="mb-0">
                Minimale score
              </Label>
              <span className="text-sm font-medium tabular-nums">⭐ {filters.minRating.toFixed(1)}</span>
            </div>
            <input
              id="f-rating"
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={filters.minRating}
              onChange={(e) => set("minRating", Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="f-minrev">Minimaal aantal reviews</Label>
              <Input id="f-minrev" type="number" min={0} value={filters.minReviews} onChange={(e) => set("minReviews", Math.max(0, Number(e.target.value)))} />
            </div>
            <div>
              <Label htmlFor="f-maxrev">Maximaal aantal reviews</Label>
              <Input id="f-maxrev" type="number" min={0} value={filters.maxReviews} onChange={(e) => set("maxReviews", Math.max(0, Number(e.target.value)))} />
            </div>
          </div>
        </div>
      </Section>
      )}

      {!showEstimates && (
        <p className="text-xs text-subtle lg:col-span-2">Sterren, reviews, grootte en budget zitten niet in deze bron. Die filters zijn verborgen zodat ze geen resultaten wegfilteren.</p>
      )}

      {/* Website filters */}
      <Section icon={<Globe className="size-3.5" />} title="Website">
        <p className="mb-2 text-xs text-subtle">Toont bedrijven met minstens één gekozen probleem. Behalve “geen website” werkt dit pas na een analyse.</p>
        <div className="grid gap-x-4 sm:grid-cols-2">
          {WEBSITE_FILTER_OPTIONS.map((o) => (
            <Checkbox
              key={o.value}
              label={o.label}
              checked={filters.websiteIssues.includes(o.value)}
              onChange={() => set("websiteIssues", toggleIn(filters.websiteIssues, o.value))}
            />
          ))}
        </div>
      </Section>

      {showEstimates && (
      <Section icon={<Wallet className="size-3.5" />} title="Schatting">
        <Label>Bedrijfsgrootte</Label>
        <div className="flex flex-wrap gap-2">
          {(["small", "medium", "large"] as BusinessSize[]).map((s) => (
            <Chip key={s} active={filters.sizes.includes(s)} onClick={() => set("sizes", toggleIn(filters.sizes, s))}>
              {SIZE_LABEL[s]}
            </Chip>
          ))}
        </div>
        <Label className="mt-4">Geschat budget</Label>
        <div className="flex flex-wrap gap-2">
          {(["low", "medium", "high"] as SpendingPotential[]).map((s) => (
            <Chip key={s} active={filters.spending.includes(s)} onClick={() => set("spending", toggleIn(filters.spending, s))}>
              {SPENDING_LABEL[s]}
            </Chip>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-subtle">Grootte en budget zijn een schatting, geen gemeten feit.</p>
      </Section>
      )}

      <Section icon={<Target className="size-3.5" />} title="Leadscore">
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="f-score" className="mb-0">
            Minimale leadscore
          </Label>
          <span className="text-sm font-medium tabular-nums">{filters.minLeadScore}</span>
        </div>
        <input
          id="f-score"
          type="range"
          min={0}
          max={100}
          step={5}
          value={filters.minLeadScore}
          onChange={(e) => set("minLeadScore", Number(e.target.value))}
          className="w-full accent-violet-500"
        />
        <div className="mt-1 flex justify-between text-[11px] text-subtle">
          <span>0</span>
          <span>55 · warm</span>
          <span>80 · heet</span>
          <span>100</span>
        </div>
      </Section>
    </div>
  );
}
