import { DEFAULT_FILTERS } from "./search";
import type { BusinessSize, SearchFilters, SpendingPotential } from "./types";

/**
 * Input validation for API routes. Never trust data coming from the browser:
 * every field is type-checked, trimmed, length-limited and clamped.
 */

const WEBSITE_FILTERS = [
  "no_website",
  "outdated",
  "poor_mobile",
  "slow",
  "poor_design",
  "no_ssl",
  "broken",
  "poor_seo",
  "low_quality",
] as const;
const SIZES: BusinessSize[] = ["small", "medium", "large"];
const SPENDING: SpendingPotential[] = ["low", "medium", "high"];

function text(value: unknown, max = 100): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function num(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function list<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is T => typeof v === "string" && (allowed as readonly string[]).includes(v));
}

export function parseSearchFilters(input: unknown): SearchFilters {
  const body = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const industries = Array.isArray(body.industries)
    ? body.industries.map((i) => text(i, 60)).filter(Boolean).slice(0, 25)
    : [];

  return {
    country: text(body.country),
    region: text(body.region),
    city: text(body.city),
    radiusKm: num(body.radiusKm, 1, 200, DEFAULT_FILTERS.radiusKm),
    industries,
    minRating: num(body.minRating, 0, 5, 0),
    minReviews: Math.round(num(body.minReviews, 0, 1_000_000, 0)),
    maxReviews: Math.round(num(body.maxReviews, 0, 1_000_000, DEFAULT_FILTERS.maxReviews)),
    websiteIssues: list(body.websiteIssues, WEBSITE_FILTERS),
    sizes: list(body.sizes, SIZES),
    spending: list(body.spending, SPENDING),
    minLeadScore: Math.round(num(body.minLeadScore, 0, 100, 0)),
  };
}

/** Only allows http(s) URLs to public-looking hostnames. */
export function parseWebsiteUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    // Block local/private targets (basic SSRF protection for the Phase 4 analyzer).
    if (host === "localhost" || host.endsWith(".local") || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
      return null;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
