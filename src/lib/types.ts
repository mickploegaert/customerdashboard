// Core domain types for MK Studios Dashboard.
// These mirror the database tables planned for Phase 2 (Supabase).

export type DataSource = "demo" | "google_places" | "geoapify" | "openstreetmap" | "manual";

export type BusinessSize = "small" | "medium" | "large";
export type SpendingPotential = "low" | "medium" | "high";

/** Problems a website can have. Only set after a website audit. */
export type WebsiteIssue =
  | "outdated"
  | "poor_mobile"
  | "slow"
  | "poor_design"
  | "no_ssl"
  | "broken"
  | "poor_seo"
  | "low_conversion";

/** A public business profile as returned by a business data provider. */
export interface Business {
  id: string;
  /** ID from the external provider (e.g. Google Place ID). Used for duplicate detection. */
  externalId: string;
  source: DataSource;
  name: string;
  industry: string;
  description: string | null;
  address: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number;
  lat: number;
  lng: number;
  openingHours: string[];
  services: string[];
  socials: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  /** Estimated – not verified data. */
  size: BusinessSize;
  /** Estimated – not verified data. */
  spendingPotential: SpendingPotential;
}

// ---------------------------------------------------------------------------
// Website audit
// ---------------------------------------------------------------------------

export type CheckStatus = "pass" | "warn" | "fail" | "unknown";

/** "verified" = measured from the site. "estimated" = a judgement/heuristic. */
export type CheckBasis = "verified" | "estimated";

export interface AuditCheck {
  label: string;
  status: CheckStatus;
  basis: CheckBasis;
  detail?: string;
}

export type AuditCategoryKey = "design" | "mobile" | "technical" | "seo" | "conversion";

export interface AuditCategory {
  key: AuditCategoryKey;
  label: string;
  score: number;
  checks: AuditCheck[];
}

/** Public business info found on the company's own website. */
export interface WebsiteEnrichment {
  emails: string[];
  phones: string[];
  socials: Business["socials"];
}

export interface WebsiteAudit {
  businessId: string;
  url: string;
  analyzedAt: string;
  source: "demo" | "live";
  score: number;
  categories: AuditCategory[];
  issues: WebsiteIssue[];
  problems: string[];
  opportunities: string[];
  /** Data URL or https URL of a real screenshot. null = no screenshot available. */
  screenshotUrl: string | null;
  enrichment: WebsiteEnrichment | null;
  /** Which tools produced this audit, e.g. "HTML scan", "PageSpeed Insights". */
  sources: string[];
}

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------

export type LeadStatus =
  | "new"
  | "researching"
  | "saved"
  | "contacted"
  | "follow_up"
  | "meeting"
  | "proposal"
  | "won"
  | "lost";

export type ContactChannel = "email" | "phone" | "instagram" | "facebook" | "linkedin" | "other";

export interface LeadNote {
  id: string;
  body: string;
  createdAt: string;
}

export interface LeadContact {
  id: string;
  channel: ContactChannel;
  contactedAt: string;
  note: string;
}

export type FollowUpType = "call" | "email" | "follow_up" | "meeting";

export interface FollowUp {
  id: string;
  type: FollowUpType;
  dueAt: string;
  done: boolean;
}

/** AI output. Every field is based only on facts we sent to the model. */
export interface LeadAiAnalysis {
  whyContact: string;
  whatToSell: string[];
  suggestedPitch: string;
  email: { subject: string; body: string } | null;
  generatedAt: string;
  model: string;
}

/** Personal CRM data per business – private to the user. */
export interface CrmRecord {
  /** Database row id (Supabase mode only). */
  leadId?: string;
  status: LeadStatus;
  starred: boolean;
  notes: LeadNote[];
  contacts: LeadContact[];
  followUps: FollowUp[];
  aiAnalysis: LeadAiAnalysis | null;
  createdAt: string;
  savedAt: string | null;
  wonAt: string | null;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export type LeadTier = "hot" | "warm" | "low";

export interface ScoreFactor {
  label: string;
  points: number;
}

export interface LeadScore {
  total: number;
  tier: LeadTier;
  factors: ScoreFactor[];
}

export type WebsiteStatus = "none" | "broken" | "outdated" | "needs_work" | "good" | "not_analyzed";

export type OpportunityKey =
  | "no_website"
  | "outdated"
  | "mobile"
  | "performance"
  | "low_conversion"
  | "strong_business"
  | "high_value";

/** A business combined with its audit, score and CRM data. Used throughout the UI. */
export interface Lead {
  business: Business;
  audit: WebsiteAudit | null;
  crm: CrmRecord;
  score: LeadScore;
  websiteStatus: WebsiteStatus;
  opportunities: OpportunityKey[];
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface SearchFilters {
  country: string;
  region: string;
  city: string;
  radiusKm: number;
  industries: string[];
  minRating: number;
  minReviews: number;
  maxReviews: number;
  websiteIssues: (WebsiteIssue | "no_website" | "low_quality")[];
  sizes: BusinessSize[];
  spending: SpendingPotential[];
  minLeadScore: number;
}

export interface SearchResponse {
  provider: DataSource;
  providerLabel: string;
  businesses: Business[];
  audits: WebsiteAudit[];
  notice: string | null;
}

export interface SearchHistoryEntry {
  id: string;
  filters: SearchFilters;
  resultCount: number;
  provider: DataSource;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Editable lead score weights (Settings → Lead scoring). */
export interface ScoringSettings {
  noWebsite: number;
  brokenWebsite: number;
  outdatedWebsite: number;
  poorMobile: number;
  slowWebsite: number;
  noSsl: number;
  poorDesign: number;
  lowConversion: number;
  poorSeo: number;
  websiteProblemCap: number;
  highValueIndustry: number;
  mediumValueIndustry: number;
  socialButNoWebsite: number;
  activeBusiness: number;
  hotThreshold: number;
  warmThreshold: number;
}

export type ThemeName = "dark" | "light";

export interface AppSettings {
  theme: ThemeName;
  userName: string;
  companyName: string;
  companyWebsite: string;
  email: string;
  defaultRadiusKm: number;
  defaultMinRating: number;
  defaultMinReviews: number;
  notifyFollowUps: boolean;
  notifyHotLeads: boolean;
  scoring: ScoringSettings;
  /** Estimated project value per industry tier (EUR). */
  projectValues: { high: number; medium: number; low: number };
}
