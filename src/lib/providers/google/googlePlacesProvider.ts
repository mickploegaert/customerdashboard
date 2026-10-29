import "server-only";

import { industryValue } from "../../constants";
import { matchesFilters } from "../../search";
import type { Business, BusinessSize, SearchFilters, SpendingPotential } from "../../types";
import type { BusinessProvider } from "../businessProvider";
import { nominatimGeocoder } from "../nominatimGeocoder";

/**
 * Google Places API (New) – Text Search.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 *
 * Runs server-side only; the API key never reaches the browser.
 * Email and social media are NOT provided by Google – they are found later by
 * the website analyzer (from the company's own public website).
 */

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.internationalPhoneNumber",
  "places.regularOpeningHours.weekdayDescriptions",
  "places.primaryTypeDisplayName",
  "places.editorialSummary",
  "places.businessStatus",
  "nextPageToken",
].join(",");

const MAX_INDUSTRIES = 6;
const MAX_PAGES_PER_QUERY = 2; // 20 results per page

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: { longText: string; shortText: string; types: string[] }[];
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  primaryTypeDisplayName?: { text: string };
  editorialSummary?: { text: string };
  businessStatus?: string;
}

/** Estimates – clearly labelled as such in the UI. */
function estimateSize(reviews: number): BusinessSize {
  if (reviews >= 500) return "large";
  if (reviews >= 100) return "medium";
  return "small";
}

function estimateSpending(industry: string, size: BusinessSize): SpendingPotential {
  const value = industryValue(industry);
  if (value === "high" && size !== "small") return "high";
  if (value === "high" || size !== "small") return "medium";
  return "low";
}

function component(place: GooglePlace, type: string, short = false): string {
  const c = place.addressComponents?.find((x) => x.types.includes(type));
  return (short ? c?.shortText : c?.longText) ?? "";
}

function toBusiness(place: GooglePlace, industry: string): Business | null {
  if (!place.location || !place.displayName?.text) return null;
  const reviews = place.userRatingCount ?? 0;
  const size = estimateSize(reviews);
  const resolvedIndustry = industry || place.primaryTypeDisplayName?.text || "Other";
  return {
    id: `gp_${place.id}`,
    externalId: place.id,
    source: "google_places",
    name: place.displayName.text.slice(0, 300),
    industry: resolvedIndustry,
    description: place.editorialSummary?.text ?? null,
    address: (place.formattedAddress ?? "").split(",")[0] ?? "",
    city: component(place, "locality") || component(place, "postal_town"),
    region: component(place, "administrative_area_level_1"),
    country: component(place, "country"),
    countryCode: component(place, "country", true),
    phone: place.internationalPhoneNumber ?? null,
    email: null,
    website: place.websiteUri ?? null,
    rating: place.rating ?? null,
    reviewCount: reviews,
    lat: place.location.latitude,
    lng: place.location.longitude,
    openingHours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    services: [],
    socials: {},
    size,
    spendingPotential: estimateSpending(resolvedIndustry, size),
  };
}

async function textSearch(apiKey: string, body: Record<string, unknown>): Promise<{ places: GooglePlace[]; nextPageToken?: string }> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google Places error ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { places?: GooglePlace[]; nextPageToken?: string };
  return { places: data.places ?? [], nextPageToken: data.nextPageToken };
}

export function createGooglePlacesProvider(apiKey: string): BusinessProvider {
  return {
    id: "google_places",
    label: "Google Places",
    isConnected: () => true,

    async search(filters: SearchFilters) {
      const location = [filters.city, filters.region, filters.country].filter(Boolean).join(", ");
      if (!location) throw new Error("Please enter at least a city, region or country.");

      const center = filters.city ? await nominatimGeocoder.geocode(location) : null;
      const industries = filters.industries.length > 0 ? filters.industries.slice(0, MAX_INDUSTRIES) : [""];
      const found = new Map<string, Business>();

      for (const industry of industries) {
        const base: Record<string, unknown> = {
          textQuery: industry ? `${industry} in ${location}` : `local businesses in ${location}`,
          pageSize: 20,
        };
        if (center) {
          base.locationBias = {
            circle: { center: { latitude: center.lat, longitude: center.lng }, radius: Math.min(filters.radiusKm * 1000, 50_000) },
          };
        }
        if (filters.minRating > 0) base.minRating = Math.floor(filters.minRating * 2) / 2; // Google accepts steps of 0.5

        let pageToken: string | undefined;
        for (let page = 0; page < MAX_PAGES_PER_QUERY; page++) {
          const { places, nextPageToken } = await textSearch(apiKey, pageToken ? { ...base, pageToken } : base);
          for (const place of places) {
            if (place.businessStatus && place.businessStatus !== "OPERATIONAL") continue;
            const business = toBusiness(place, industry);
            if (business && !found.has(place.id)) found.set(place.id, business);
          }
          if (!nextPageToken) break;
          pageToken = nextPageToken;
        }
      }

      const businesses = [...found.values()].filter((b) => matchesFilters(b, null, filters, center, { includeUnanalyzed: true }));

      const notes: string[] = [];
      if (filters.city && !center) notes.push(`Could not locate "${location}" on the map, so the radius filter was not applied.`);
      if (filters.websiteIssues.some((i) => i !== "no_website")) {
        notes.push("Website problem filters are applied after a website is analyzed. Businesses with unanalyzed websites are included.");
      }
      if (filters.industries.length > MAX_INDUSTRIES) notes.push(`Only the first ${MAX_INDUSTRIES} industries were searched.`);

      return {
        provider: "google_places",
        providerLabel: "Google Places",
        businesses,
        audits: [],
        notice: notes.length ? notes.join(" ") : null,
      };
    },
  };
}
