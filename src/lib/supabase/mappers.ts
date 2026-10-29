import { normalizePhone, uniqueWebsiteDomain } from "../leads";
import type { Business, CrmRecord, SearchHistoryEntry, WebsiteAudit } from "../types";

/** Converts between database rows (snake_case) and app types (camelCase). */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

export function businessToRow(b: Business): Row {
  return {
    source: b.source,
    external_id: b.externalId,
    name: b.name,
    industry: b.industry,
    description: b.description,
    address: b.address,
    city: b.city,
    region: b.region,
    country: b.country,
    country_code: b.countryCode,
    phone: b.phone,
    phone_normalized: normalizePhone(b.phone),
    email: b.email,
    website: b.website,
    website_domain: uniqueWebsiteDomain(b.website),
    rating: b.rating,
    review_count: b.reviewCount,
    lat: b.lat,
    lng: b.lng,
    opening_hours: b.openingHours,
    services: b.services,
    socials: b.socials,
    size: b.size,
    spending_potential: b.spendingPotential,
  };
}

export function rowToBusiness(r: Row): Business {
  return {
    id: r.id,
    externalId: r.external_id,
    source: r.source,
    name: r.name,
    industry: r.industry,
    description: r.description,
    address: r.address,
    city: r.city,
    region: r.region,
    country: r.country,
    countryCode: r.country_code,
    phone: r.phone,
    email: r.email,
    website: r.website,
    rating: r.rating === null ? null : Number(r.rating),
    reviewCount: r.review_count,
    lat: r.lat,
    lng: r.lng,
    openingHours: r.opening_hours ?? [],
    services: r.services ?? [],
    socials: r.socials ?? {},
    size: r.size,
    spendingPotential: r.spending_potential,
  };
}

export function auditToRow(a: WebsiteAudit): Row {
  return {
    business_id: a.businessId,
    url: a.url,
    source: a.source,
    score: a.score,
    categories: a.categories,
    issues: a.issues,
    problems: a.problems,
    opportunities: a.opportunities,
    screenshot_url: a.screenshotUrl,
    enrichment: a.enrichment,
    sources: a.sources,
    analyzed_at: a.analyzedAt,
  };
}

export function rowToAudit(r: Row): WebsiteAudit {
  return {
    businessId: r.business_id,
    url: r.url,
    source: r.source,
    score: r.score,
    categories: r.categories ?? [],
    issues: r.issues ?? [],
    problems: r.problems ?? [],
    opportunities: r.opportunities ?? [],
    screenshotUrl: r.screenshot_url,
    enrichment: r.enrichment,
    sources: r.sources ?? [],
    analyzedAt: r.analyzed_at,
  };
}

/** A `leads` row with its notes, contacts and follow-ups embedded. */
export function rowToCrm(r: Row): CrmRecord {
  return {
    leadId: r.id,
    status: r.status,
    starred: r.starred,
    aiAnalysis: r.ai_analysis,
    createdAt: r.created_at,
    savedAt: r.saved_at,
    wonAt: r.won_at,
    updatedAt: r.updated_at,
    notes: (r.lead_notes ?? [])
      .map((n: Row) => ({ id: n.id, body: n.body, createdAt: n.created_at }))
      .sort((a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt)),
    contacts: (r.lead_contacts ?? [])
      .map((c: Row) => ({ id: c.id, channel: c.channel, contactedAt: c.contacted_at, note: c.note }))
      .sort((a: { contactedAt: string }, b: { contactedAt: string }) => b.contactedAt.localeCompare(a.contactedAt)),
    followUps: (r.follow_ups ?? []).map((f: Row) => ({ id: f.id, type: f.type, dueAt: f.due_at, done: f.done })),
  };
}

export function rowToSearch(r: Row): SearchHistoryEntry {
  return { id: r.id, filters: r.filters, resultCount: r.result_count, provider: r.provider, createdAt: r.created_at };
}
