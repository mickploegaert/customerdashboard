"use client";

import { ExternalLink, Globe, MapPin, ScanSearch, Send, Star } from "lucide-react";
import { LeadScoreBadge, Rating, WebsiteStatusBadge } from "@/components/leads/LeadBadges";
import { StatusSelect } from "@/components/leads/StatusSelect";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import { industryLabel } from "@/lib/constants";
import { cn } from "@/lib/format";
import { isDemoDomain, mapsUrl, safeExternalUrl } from "@/lib/safeUrl";
import { useLeadStore } from "@/lib/store/LeadStore";
import type { Lead } from "@/lib/types";

/** Business profile header: identity, score, status and primary actions. */
export function LeadHeader({ lead, onContact, onAnalyze }: { lead: Lead; onContact: () => void; onAnalyze: () => void }) {
  const { toggleStar } = useLeadStore();
  const b = lead.business;
  const website = safeExternalUrl(b.website);
  const demoDomain = isDemoDomain(b.website);

  return (
    <Card className="overflow-hidden">
      <div className="h-16 border-b border-line bg-[radial-gradient(ellipse_at_top_left,rgb(139_92_246/0.18),transparent_60%)]" />
      <div className="-mt-8 px-5 pb-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-end gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-line-strong bg-elevated text-2xl font-semibold text-accent-text shadow-lg">
              {b.name.slice(0, 1)}
            </span>
            <div className="min-w-0 pb-0.5">
              <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{b.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-subtle">
                <span>{industryLabel(b.industry)}</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {b.city}, {b.region}, {b.country}
                </span>
                <Rating rating={b.rating} reviews={b.reviewCount} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LeadScoreBadge score={lead.score} size="lg" />
            <WebsiteStatusBadge status={lead.websiteStatus} />
            <StatusSelect id={b.id} status={lead.crm.status} className="w-40" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant={lead.crm.starred ? "secondary" : "primary"}
            icon={<Star className={cn("size-4", lead.crm.starred && "fill-warm text-warm")} />}
            onClick={() => toggleStar(b.id)}
          >
            {lead.crm.starred ? "Bewaard" : "Bewaren"}
          </Button>
          <Button icon={<Send className="size-4" />} onClick={onContact}>
            Contact
          </Button>
          {b.website && (
            <Button icon={<ScanSearch className="size-4" />} onClick={onAnalyze}>
              Website bekijken
            </Button>
          )}
          {website && !demoDomain ? (
            <ButtonLink href={website} external icon={<Globe className="size-4" />}>
              Open site
            </ButtonLink>
          ) : (
            <Tooltip content={demoDomain ? "Demodomein (.example). Deze site bestaat niet." : "Geen website gevonden."}>
              <Button disabled icon={<Globe className="size-4" />}>
                Open site
              </Button>
            </Tooltip>
          )}
          <ButtonLink href={mapsUrl(b.lat, b.lng)} external variant="ghost" icon={<ExternalLink className="size-4" />}>
            Kaart
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}
