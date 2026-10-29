import { AtSign, Clock, Database, Globe, Mail, MapPin, Phone, Star, Tag, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { LeadMap } from "@/components/map/LeadMap";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { industryLabel } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { safeExternalUrl } from "@/lib/safeUrl";
import type { Lead } from "@/lib/types";

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5">
      <span className="mt-0.5 text-subtle">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium tracking-wide text-subtle uppercase">{label}</div>
        <div className="mt-0.5 text-sm break-words text-fg">{children}</div>
      </div>
    </div>
  );
}

const Unknown = () => <span className="text-subtle">Unknown</span>;

const SOURCE_LABEL = {
  demo: "Demo (verzonnen)",
  google_places: "Google Places",
  geoapify: "Geoapify (geen reviews)",
  openstreetmap: "OpenStreetMap (geen reviews)",
  manual: "Zelf toegevoegd",
} as const;

export function BusinessInfo({ lead }: { lead: Lead }) {
  const b = lead.business;
  const socials = (["instagram", "facebook", "linkedin"] as const)
    .map((key) => ({ key, url: safeExternalUrl(b.socials[key]) }))
    .filter((s) => s.url);

  return (
    <Card>
      <CardHeader
        title="Bedrijf"
        action={
          <Badge tone="accent" icon={<Database className="size-3" />}>
            {SOURCE_LABEL[b.source]}
          </Badge>
        }
      />
      <div className="h-40 overflow-hidden border-b border-line">
        <LeadMap leads={[lead]} className="h-full w-full" />
      </div>
      <div className="divide-y divide-line px-5 pb-3">
        <Row icon={<Tag className="size-4" />} label="Branche">{industryLabel(b.industry)}</Row>
        <Row icon={<MapPin className="size-4" />} label="Adres">
          {b.address}, {b.city}, {b.region}, {b.country}
        </Row>
        <Row icon={<Phone className="size-4" />} label="Telefoon">
          {b.phone ? <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="hover:text-accent-text">{b.phone}</a> : <Unknown />}
        </Row>
        <Row icon={<Mail className="size-4" />} label="Email">
          {b.email ? <a href={`mailto:${b.email}`} className="hover:text-accent-text">{b.email}</a> : <span className="text-subtle">Niet openbaar</span>}
        </Row>
        <Row icon={<Globe className="size-4" />} label="Website">
          {b.website ?? <span className="text-hot">Geen website</span>}
        </Row>
        <Row icon={<AtSign className="size-4" />} label="Social media">
          {socials.length === 0 ? (
            <span className="text-subtle">Niet gevonden</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {socials.map((s) => (
                <a key={s.key} href={s.url!} target="_blank" rel="noopener noreferrer nofollow" className="rounded-md border border-line-strong px-2 py-0.5 text-xs capitalize hover:bg-hover">
                  {s.key}
                </a>
              ))}
            </div>
          )}
        </Row>
        <Row icon={<Star className="size-4" />} label="Beoordeling">
          {b.rating !== null ? `${b.rating.toFixed(1)} · ${formatNumber(b.reviewCount)} reviews` : <Unknown />}
        </Row>
        <Row icon={<Clock className="size-4" />} label="Openingstijden">
          {b.openingHours.length === 0 ? (
            <Unknown />
          ) : (
            <ul className="grid grid-cols-1 gap-0.5 text-xs text-muted">
              {b.openingHours.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}
        </Row>
        {b.services.length > 0 && (
          <Row icon={<Wrench className="size-4" />} label="Diensten">
            <div className="flex flex-wrap gap-1.5">
              {b.services.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          </Row>
        )}
        {b.description && (
          <p className="pt-3 text-sm leading-relaxed text-muted">{b.description}</p>
        )}
      </div>
    </Card>
  );
}
