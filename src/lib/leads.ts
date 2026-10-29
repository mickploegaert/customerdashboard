import { industryValue, PROJECT_VALUE_BY_TIER } from "./constants";
import { calculateLeadScore, DEFAULT_SCORING } from "./scoring";
import type {
  AppSettings,
  Business,
  CrmRecord,
  Lead,
  OpportunityKey,
  ScoringSettings,
  WebsiteAudit,
  WebsiteStatus,
} from "./types";

/** Summarises a website into one status label. */
export function getWebsiteStatus(business: Business, audit: WebsiteAudit | null): WebsiteStatus {
  if (!business.website) return "none";
  if (!audit) return "not_analyzed";
  if (audit.issues.includes("broken")) return "broken";
  if (audit.issues.includes("outdated")) return "outdated";
  if (audit.score < 70 || audit.issues.length > 0) return "needs_work";
  return "good";
}

/** Detects the opportunity badges for a lead. A lead can have several. */
export function getOpportunities(business: Business, audit: WebsiteAudit | null): OpportunityKey[] {
  const result: OpportunityKey[] = [];
  if (!business.website) result.push("no_website");
  if (audit?.issues.includes("outdated")) result.push("outdated");
  if (audit?.issues.includes("poor_mobile")) result.push("mobile");
  if (audit?.issues.includes("slow")) result.push("performance");
  if (audit?.issues.includes("low_conversion")) result.push("low_conversion");
  if (business.reviewCount >= 150 && (business.rating ?? 0) >= 4.5) result.push("strong_business");
  if (industryValue(business.industry) === "high") result.push("high_value");
  return result;
}

/**
 * Merges public data found on the website (emails, socials) into the
 * business profile, without overwriting data from the business provider.
 */
function withEnrichment(business: Business, audit: WebsiteAudit | null): Business {
  const e = audit?.enrichment;
  if (!e) return business;
  return {
    ...business,
    email: business.email ?? e.emails[0] ?? null,
    phone: business.phone ?? e.phones[0] ?? null,
    socials: { ...e.socials, ...business.socials },
  };
}

export function buildLead(
  business: Business,
  audit: WebsiteAudit | null,
  crm: CrmRecord,
  scoring: ScoringSettings = DEFAULT_SCORING,
): Lead {
  const enriched = withEnrichment(business, audit);
  return {
    business: enriched,
    audit,
    crm,
    score: calculateLeadScore(enriched, audit, scoring),
    websiteStatus: getWebsiteStatus(enriched, audit),
    opportunities: getOpportunities(enriched, audit),
  };
}

/** Estimated project value for a lead (EUR). This is an estimate, not real data. */
export function estimatedProjectValue(lead: Lead, values: AppSettings["projectValues"] = PROJECT_VALUE_BY_TIER): number {
  return values[industryValue(lead.business.industry)];
}

export function emptyCrmRecord(): CrmRecord {
  const now = new Date().toISOString();
  return {
    status: "new",
    starred: false,
    notes: [],
    contacts: [],
    followUps: [],
    aiAnalysis: null,
    createdAt: now,
    savedAt: null,
    wonAt: null,
    updatedAt: now,
  };
}

/** Normalises a website URL to its domain, e.g. "https://www.Foo.com/x" -> "foo.com". */
export function websiteDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return host.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Keeps only digits so phone numbers in different formats can be compared. */
export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

/** Social/link-in-bio domains are not a unique business website. */
const SHARED_DOMAINS = ["facebook.com", "instagram.com", "linktr.ee", "linkedin.com", "google.com", "business.site", "wixsite.com", "yelp.com"];

export function uniqueWebsiteDomain(url: string | null): string | null {
  const domain = websiteDomain(url);
  if (!domain || SHARED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return null;
  return domain;
}

/**
 * Duplicate detection: two businesses are the same if they share an external
 * ID (e.g. Google Place ID), a website domain, or a phone number.
 */
export function isSameBusiness(a: Business, b: Business): boolean {
  if (a.externalId && a.externalId === b.externalId) return true;
  const domainA = uniqueWebsiteDomain(a.website);
  if (domainA && domainA === uniqueWebsiteDomain(b.website)) return true;
  const phoneA = normalizePhone(a.phone);
  if (phoneA && phoneA === normalizePhone(b.phone)) return true;
  return false;
}
