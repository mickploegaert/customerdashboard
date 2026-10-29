import { industryLabel } from "./constants";
import { calculateLeadScore } from "./scoring";
import { distanceKm, type Coordinates } from "./providers/mapsProvider";
import type { Business, SearchFilters, WebsiteAudit } from "./types";

export const DEFAULT_FILTERS: SearchFilters = {
  country: "",
  region: "",
  city: "",
  radiusKm: 25,
  industries: [],
  minRating: 0,
  minReviews: 0,
  maxReviews: 10000,
  websiteIssues: [],
  sizes: [],
  spending: [],
  minLeadScore: 0,
};

const contains = (value: string, query: string) => value.toLowerCase().includes(query.trim().toLowerCase());

/** Returns true when a business matches all active search filters. */
export function matchesFilters(
  business: Business,
  audit: WebsiteAudit | null,
  filters: SearchFilters,
  center: Coordinates | null,
  options: { includeUnanalyzed?: boolean; skipReviewFilters?: boolean; skipEstimatedFilters?: boolean } = {},
): boolean {
  if (filters.country && !contains(business.country, filters.country) && business.countryCode.toLowerCase() !== filters.country.trim().toLowerCase()) {
    return false;
  }
  if (filters.region && !contains(business.region, filters.region)) return false;

  if (filters.city) {
    if (center) {
      if (distanceKm(center, business) > filters.radiusKm) return false;
    } else if (!contains(business.city, filters.city)) {
      return false;
    }
  }

  if (filters.industries.length > 0) {
    const match = filters.industries.some((i) => i.toLowerCase() === business.industry.toLowerCase());
    if (!match) return false;
  }

  if (!options.skipReviewFilters) {
    if (filters.minRating > 0 && (business.rating ?? 0) < filters.minRating) return false;
    if (business.reviewCount < filters.minReviews) return false;
    if (business.reviewCount > filters.maxReviews) return false;
  }

  // Website filters: a business matches if it has ANY of the selected problems.
  if (filters.websiteIssues.length > 0) {
    const match = filters.websiteIssues.some((issue) => {
      if (issue === "no_website") return !business.website;
      // Live search: websites are not analyzed yet, so keep them as possible matches.
      if (options.includeUnanalyzed && business.website && !audit) return true;
      if (issue === "low_quality") return Boolean(business.website && audit && audit.score < 50);
      return Boolean(audit?.issues.includes(issue));
    });
    if (!match) return false;
  }

  if (!options.skipEstimatedFilters) {
    if (filters.sizes.length > 0 && !filters.sizes.includes(business.size)) return false;
    if (filters.spending.length > 0 && !filters.spending.includes(business.spendingPotential)) return false;
  }

  // Unanalyzed websites can still gain points after analysis, so don't drop them on score alone.
  const canStillGain = options.includeUnanalyzed && business.website && !audit;
  if (!canStillGain && filters.minLeadScore > 0 && calculateLeadScore(business, audit).total < filters.minLeadScore) return false;

  return true;
}

/** One-line summary of a search, used in search history. */
export function summarizeFilters(filters: SearchFilters): string {
  const parts: string[] = [];
  const place = [filters.city, filters.region, filters.country].filter(Boolean).join(", ");
  if (place) parts.push(place);
  if (filters.city && filters.radiusKm) parts.push(`${filters.radiusKm} km`);
  if (filters.industries.length > 0) {
    const shown = filters.industries.slice(0, 3).map(industryLabel).join(", ");
    parts.push(filters.industries.length > 3 ? `${shown} +${filters.industries.length - 3}` : shown);
  }
  if (filters.minRating > 0) parts.push(`Min ${filters.minRating.toFixed(1)}★`);
  if (filters.minReviews > 0) parts.push(`${filters.minReviews}+ reviews`);
  if (filters.websiteIssues.includes("no_website")) parts.push("Geen website");
  if (filters.minLeadScore > 0) parts.push(`Score ${filters.minLeadScore}+`);
  return parts.join(" · ") || "Alle bedrijven";
}
