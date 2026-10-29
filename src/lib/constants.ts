import type {
  ContactChannel,
  FollowUpType,
  LeadStatus,
  LeadTier,
  OpportunityKey,
  WebsiteIssue,
  WebsiteStatus,
} from "./types";

export const APP_NAME = "MK Studios Dashboard";

/** Industries with an estimated "value tier" used by the lead score and revenue estimate. */
export const INDUSTRIES: { name: string; label: string; value: "high" | "medium" | "low" }[] = [
  { name: "Auto Detailing", label: "Auto detailing", value: "medium" },
  { name: "Auto Repair", label: "Autogarage", value: "high" },
  { name: "Roofing", label: "Dakdekker", value: "high" },
  { name: "Plumbing", label: "Loodgieter", value: "high" },
  { name: "Electrical", label: "Elektricien", value: "high" },
  { name: "Landscaping", label: "Hovenier", value: "medium" },
  { name: "Construction", label: "Bouw", value: "high" },
  { name: "Dental", label: "Tandarts", value: "high" },
  { name: "Med Spa", label: "Schoonheidskliniek", value: "high" },
  { name: "Restaurants", label: "Restaurant", value: "low" },
  { name: "Hotels", label: "Hotel", value: "medium" },
  { name: "Barbers", label: "Kapper", value: "low" },
  { name: "Beauty", label: "Schoonheid", value: "medium" },
  { name: "Gyms", label: "Sportschool", value: "medium" },
  { name: "Real Estate", label: "Makelaar", value: "high" },
  { name: "Photography", label: "Fotograaf", value: "medium" },
  { name: "Cleaning", label: "Schoonmaak", value: "medium" },
  { name: "Other", label: "Overig", value: "low" },
];

/** Estimated average website project value per industry tier (EUR). */
export const PROJECT_VALUE_BY_TIER = { high: 4000, medium: 2500, low: 1500 } as const;

export function industryValue(industry: string): "high" | "medium" | "low" {
  return INDUSTRIES.find((i) => i.name.toLowerCase() === industry.toLowerCase())?.value ?? "low";
}

/** Dutch name for a stored industry key. Unknown names are shown as-is. */
export function industryLabel(industry: string): string {
  return INDUSTRIES.find((i) => i.name.toLowerCase() === industry.toLowerCase())?.label ?? industry;
}

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Nieuw" },
  { value: "researching", label: "Onderzoeken" },
  { value: "saved", label: "Bewaard" },
  { value: "contacted", label: "Benaderd" },
  { value: "follow_up", label: "Opvolgen" },
  { value: "meeting", label: "Afspraak" },
  { value: "proposal", label: "Voorstel" },
  { value: "won", label: "Gewonnen" },
  { value: "lost", label: "Verloren" },
];

export const STATUS_LABEL: Record<LeadStatus, string> = Object.fromEntries(
  LEAD_STATUSES.map((s) => [s.value, s.label]),
) as Record<LeadStatus, string>;

/** Statuses that count as "we reached out". */
export const CONTACTED_STATUSES: LeadStatus[] = ["contacted", "follow_up", "meeting", "proposal", "won"];

export const TIER_LABEL: Record<LeadTier, string> = { hot: "Heet", warm: "Warm", low: "Laag" };

export const SIZE_LABEL = { small: "Klein", medium: "Middel", large: "Groot" } as const;
export const SPENDING_LABEL = { low: "Laag", medium: "Middel", high: "Hoog" } as const;

export const WEBSITE_STATUS_LABEL: Record<WebsiteStatus, string> = {
  none: "Geen website",
  broken: "Kapot",
  outdated: "Verouderd",
  needs_work: "Moet beter",
  good: "Goed",
  not_analyzed: "Nog niet bekeken",
};

export const WEBSITE_ISSUE_LABEL: Record<WebsiteIssue, string> = {
  outdated: "Oude website",
  poor_mobile: "Slecht op mobiel",
  slow: "Trage website",
  poor_design: "Zwak design",
  no_ssl: "Geen SSL",
  broken: "Kapotte website",
  poor_seo: "Zwakke SEO",
  low_conversion: "Weinig conversie",
};

export const OPPORTUNITY_META: Record<OpportunityKey, { label: string; emoji: string; description: string }> = {
  no_website: { label: "Geen website", emoji: "🔥", description: "Er is geen website gevonden." },
  outdated: { label: "Verouderde website", emoji: "⚠️", description: "Er is een site, maar die oogt sterk verouderd." },
  mobile: { label: "Mobiel probleem", emoji: "📱", description: "De site werkt slecht op een telefoon." },
  performance: { label: "Snelheid", emoji: "🐌", description: "De site laadt traag." },
  low_conversion: { label: "Weinig conversie", emoji: "📉", description: "Geen duidelijke knop of contactmogelijkheid." },
  strong_business: { label: "Sterk bedrijf", emoji: "⭐", description: "Veel reviews en een hoge score." },
  high_value: { label: "Hoge waarde", emoji: "💰", description: "Branche met waarschijnlijk een hoge klantwaarde." },
};

export const CONTACT_CHANNELS: { value: ContactChannel; label: string }[] = [
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefoon" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "other", label: "Anders" },
];

export const FOLLOW_UP_LABEL: Record<FollowUpType, string> = {
  call: "Bellen",
  email: "E-mail sturen",
  follow_up: "Opvolgen",
  meeting: "Afspraak",
};
