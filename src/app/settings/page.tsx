"use client";

import { Bell, Building2, KeyRound, Moon, RotateCcw, Search, Sun, Target, User } from "lucide-react";
import { useState, type ReactNode } from "react";
import { PageContainer } from "@/components/layout/AppShell";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Checkbox, Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { dataMode } from "@/lib/config";
import { cn } from "@/lib/format";
import { DEFAULT_SCORING, FEW_REVIEWS_PENALTY, LOW_RATING_PENALTY, RATING_TIERS, REVIEW_TIERS } from "@/lib/scoring";
import { useLeadStore } from "@/lib/store/LeadStore";
import { applyTheme } from "@/lib/theme";
import { useIntegrationStatus } from "@/lib/useStatus";
import type { ScoringSettings, ThemeName } from "@/lib/types";

type Section = "profile" | "company" | "search" | "scoring" | "api" | "theme" | "notifications";

const SECTIONS: { value: Section; label: string; icon: ReactNode }[] = [
  { value: "profile", label: "Profiel", icon: <User className="size-4" /> },
  { value: "company", label: "Bedrijf", icon: <Building2 className="size-4" /> },
  { value: "search", label: "Zoeken", icon: <Search className="size-4" /> },
  { value: "scoring", label: "Score", icon: <Target className="size-4" /> },
  { value: "api", label: "Koppelingen", icon: <KeyRound className="size-4" /> },
  { value: "theme", label: "Thema", icon: <Moon className="size-4" /> },
  { value: "notifications", label: "Meldingen", icon: <Bell className="size-4" /> },
];

const WEIGHT_FIELDS: { key: keyof ScoringSettings; label: string; max: number }[] = [
  { key: "noWebsite", label: "Geen website", max: 50 },
  { key: "brokenWebsite", label: "Website lijkt kapot", max: 50 },
  { key: "outdatedWebsite", label: "Hele oude website", max: 50 },
  { key: "poorMobile", label: "Slechte mobiele site", max: 40 },
  { key: "slowWebsite", label: "Trage website", max: 25 },
  { key: "noSsl", label: "Geen SSL", max: 25 },
  { key: "poorDesign", label: "Zwak design", max: 25 },
  { key: "lowConversion", label: "Geen duidelijke knop", max: 20 },
  { key: "poorSeo", label: "Zwakke SEO", max: 20 },
  { key: "websiteProblemCap", label: "Websiteproblemen samen (max)", max: 80 },
  { key: "highValueIndustry", label: "Branche met hoge waarde", max: 25 },
  { key: "mediumValueIndustry", label: "Branche met middelhoge waarde", max: 20 },
  { key: "socialButNoWebsite", label: "Social media, geen website", max: 15 },
  { key: "activeBusiness", label: "Gevestigd, actief bedrijf", max: 15 },
  { key: "hotThreshold", label: "Grens heet", max: 100 },
  { key: "warmThreshold", label: "Grens warm", max: 100 },
];

function StatusBadge({ on }: { on: boolean }) {
  const tone: BadgeTone = on ? "success" : "warm";
  return <Badge tone={tone}>{on ? "Aan" : "Uit"}</Badge>;
}

export default function SettingsPage() {
  const { settings, updateSettings, resetDemoData } = useLeadStore();
  const status = useIntegrationStatus();
  const [section, setSection] = useState<Section>("profile");
  const [confirmReset, setConfirmReset] = useState(false);

  const scoring = settings.scoring;
  const setScore = (key: keyof ScoringSettings, value: number) => {
    const n = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
    updateSettings({ scoring: { ...scoring, [key]: n } });
  };

  const storageHint =
    dataMode === "supabase"
      ? "Opgeslagen in je Supabase-account."
      : dataMode === "demo"
        ? "Opgeslagen in deze browser (demo)."
        : "Opgeslagen in deze browser, tot er cloud-opslag is.";

  return (
    <PageContainer>
      <PageHeader title="Instellingen" description={storageHint} />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {SECTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSection(s.value)}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
                section === s.value ? "bg-elevated text-fg ring-1 ring-line-strong" : "text-muted hover:bg-hover hover:text-fg",
              )}
            >
              <span className={section === s.value ? "text-accent-text" : "text-subtle"}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        <Card>
          {section === "profile" && (
            <>
              <CardHeader title="Profiel" description="Je naam staat in de begroeting en in conceptmails." />
              <div className="grid max-w-lg gap-4 p-5">
                <div>
                  <Label htmlFor="s-name">Naam</Label>
                  <Input id="s-name" value={settings.userName} maxLength={60} onChange={(e) => updateSettings({ userName: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="s-email">E-mail</Label>
                  <Input
                    id="s-email"
                    type="email"
                    value={settings.email}
                    maxLength={120}
                    onChange={(e) => updateSettings({ email: e.target.value })}
                    disabled={dataMode === "supabase"}
                  />
                  {dataMode === "supabase" && <p className="mt-1 text-xs text-subtle">E-mail komt van je inlogaccount.</p>}
                </div>
              </div>
            </>
          )}

          {section === "company" && (
            <>
              <CardHeader title="Bedrijf" description="Staat in conceptmails en pitches." />
              <div className="grid max-w-lg gap-4 p-5">
                <div>
                  <Label htmlFor="s-company">Bedrijfsnaam</Label>
                  <Input
                    id="s-company"
                    value={settings.companyName}
                    maxLength={100}
                    onChange={(e) => updateSettings({ companyName: e.target.value })}
                    placeholder="MK Studios"
                  />
                </div>
                <div>
                  <Label htmlFor="s-site">Website</Label>
                  <Input
                    id="s-site"
                    value={settings.companyWebsite}
                    maxLength={200}
                    onChange={(e) => updateSettings({ companyWebsite: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
              </div>
            </>
          )}

          {section === "search" && (
            <>
              <CardHeader title="Zoeken" description="Staat al ingevuld als je een zoekopdracht opent." />
              <div className="grid max-w-lg gap-4 p-5 sm:grid-cols-3">
                <div>
                  <Label>Standaard straal</Label>
                  <Select
                    value={String(settings.defaultRadiusKm)}
                    onChange={(e) => updateSettings({ defaultRadiusKm: Number(e.target.value) })}
                    options={[5, 10, 25, 50, 100, 200].map((km) => ({ value: String(km), label: `${km} km` }))}
                  />
                </div>
                <div>
                  <Label>Min. score</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={settings.defaultMinRating}
                    onChange={(e) => updateSettings({ defaultMinRating: Math.min(5, Math.max(0, Number(e.target.value))) })}
                  />
                </div>
                <div>
                  <Label>Min. reviews</Label>
                  <Input
                    type="number"
                    min={0}
                    value={settings.defaultMinReviews}
                    onChange={(e) => updateSettings({ defaultMinReviews: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
              </div>
            </>
          )}

          {section === "scoring" && (
            <>
              <CardHeader
                title="Leadscore"
                description={`Score loopt van 0 tot 100. Heet vanaf ${scoring.hotThreshold}, warm vanaf ${scoring.warmThreshold}. Wijzigingen gelden meteen.`}
                action={
                  <Button size="sm" variant="ghost" onClick={() => updateSettings({ scoring: { ...DEFAULT_SCORING } })}>
                    Standaard
                  </Button>
                }
              />
              <ul className="divide-y divide-line px-5 py-2">
                {WEIGHT_FIELDS.map((field) => (
                  <li key={field.key} className="flex items-center justify-between gap-4 py-2">
                    <Label htmlFor={`w-${field.key}`} className="mb-0 flex-1 text-sm text-muted">
                      {field.label}
                    </Label>
                    <Input
                      id={`w-${field.key}`}
                      type="number"
                      min={0}
                      max={field.max}
                      className="w-20 text-right"
                      value={scoring[field.key]}
                      onChange={(e) => setScore(field.key, Number(e.target.value))}
                    />
                  </li>
                ))}
              </ul>
              <div className="border-t border-line px-5 py-4 text-xs text-subtle">
                <p className="font-medium text-muted">Vaste punten voor reviews en score</p>
                <p className="mt-1">
                  Reviews: {REVIEW_TIERS.map((t) => `${t.min}+ → +${t.points}`).join(" · ")} · onder 10 reviews {FEW_REVIEWS_PENALTY}
                </p>
                <p>
                  Score: {RATING_TIERS.map((t) => `${t.min}+ → +${t.points}`).join(" · ")} · onder 3,5 {LOW_RATING_PENALTY}
                </p>
              </div>
              <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-3">
                <div>
                  <Label>Geschatte projectwaarde – hoog</Label>
                  <Input
                    type="number"
                    min={0}
                    value={settings.projectValues.high}
                    onChange={(e) => updateSettings({ projectValues: { ...settings.projectValues, high: Math.max(0, Number(e.target.value) || 0) } })}
                  />
                </div>
                <div>
                  <Label>Middel</Label>
                  <Input
                    type="number"
                    min={0}
                    value={settings.projectValues.medium}
                    onChange={(e) => updateSettings({ projectValues: { ...settings.projectValues, medium: Math.max(0, Number(e.target.value) || 0) } })}
                  />
                </div>
                <div>
                  <Label>Laag</Label>
                  <Input
                    type="number"
                    min={0}
                    value={settings.projectValues.low}
                    onChange={(e) => updateSettings({ projectValues: { ...settings.projectValues, low: Math.max(0, Number(e.target.value) || 0) } })}
                  />
                </div>
              </div>
            </>
          )}

          {section === "api" && (
            <>
              <CardHeader title="Koppelingen" description="Sleutels staan in .env.local op de server, niet in de browser." />
              <ul className="divide-y divide-line px-5 py-3">
                {[
                  { name: "Supabase (cloud)", env: "NEXT_PUBLIC_SUPABASE_URL", on: Boolean(status?.supabase) },
                  { name: "Geoapify zoeken", env: "GEOAPIFY_API_KEY", on: Boolean(status?.geoapify) },
                  { name: "OpenStreetMap zoeken", env: "Geen sleutel · openbare kaartdata", on: Boolean(status?.openStreetMap) },
                  { name: "Google Places zoeken", env: "GOOGLE_PLACES_API_KEY", on: Boolean(status?.googlePlaces) },
                  { name: "Website-check", env: "Ingebouwde HTML-scan", on: Boolean(status?.websiteAnalyzer) },
                  { name: "PageSpeed Insights", env: "PAGESPEED_API_KEY", on: Boolean(status?.pageSpeed) },
                  {
                    name: "Leadtekst",
                    env: status?.aiProvider === "openai" ? "OPENAI_API_KEY" : "Alleen feiten · geen AI-sleutel",
                    on: Boolean(status?.ai),
                  },
                ].map((p) => (
                  <li key={p.env} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <span className="block text-sm">{p.name}</span>
                      <code className="text-[11px] text-subtle">{p.env}</code>
                    </span>
                    <StatusBadge on={p.on} />
                  </li>
                ))}
              </ul>
              {dataMode === "demo" && (
                <div className="flex flex-col gap-3 border-t border-line p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Demogegevens terugzetten</p>
                    <p className="text-xs text-subtle">Zet de 30 verzonnen leads terug en wist lokale notities en statussen.</p>
                  </div>
                  <Button variant="danger" icon={<RotateCcw className="size-4" />} onClick={() => setConfirmReset(true)}>
                    Demo terugzetten
                  </Button>
                </div>
              )}
            </>
          )}

          {section === "theme" && (
            <>
              <CardHeader title="Thema" description="Donker of licht. De keuze blijft in deze browser." />
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                {(
                  [
                    { value: "dark" as ThemeName, label: "Donker", hint: "Rustig bij weinig licht", icon: <Moon className="size-4" /> },
                    { value: "light" as ThemeName, label: "Licht", hint: "Helder overdag", icon: <Sun className="size-4" /> },
                  ]
                ).map((option) => {
                  const active = settings.theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        applyTheme(option.value);
                        updateSettings({ theme: option.value });
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border px-4 py-3 text-left",
                        active ? "border-accent/50 bg-accent-soft" : "border-line-strong hover:bg-hover",
                      )}
                    >
                      <span className={active ? "text-accent-text" : "text-subtle"}>{option.icon}</span>
                      <span>
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {option.label}
                          {active && <Badge tone="accent">Actief</Badge>}
                        </span>
                        <span className="mt-0.5 block text-xs text-subtle">{option.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {section === "notifications" && (
            <>
              <CardHeader title="Meldingen" description="Meldingen in de balk bovenaan." />
              <div className="space-y-2 p-5">
                <Checkbox label="Opvolging voor vandaag" checked={settings.notifyFollowUps} onChange={(v) => updateSettings({ notifyFollowUps: v })} />
                <Checkbox label="Nieuwe hete leads" checked={settings.notifyHotLeads} onChange={(v) => updateSettings({ notifyHotLeads: v })} />
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Demogegevens terugzetten?"
        description="Lokale notities, statussen, bewaarde leads en analyses gaan verloren."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Annuleren
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetDemoData();
                setConfirmReset(false);
              }}
            >
              Terugzetten
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">This cannot be undone.</p>
      </Modal>
    </PageContainer>
  );
}
