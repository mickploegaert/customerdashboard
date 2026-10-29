import "server-only";

import { industryValue } from "../../constants";
import { matchesFilters } from "../../search";
import type { Business, BusinessSize, SearchFilters, SpendingPotential } from "../../types";
import type { BusinessProvider } from "../businessProvider";
import {
  nominatimGeocoder,
  nominatimLookup,
  nominatimSearchTag,
  nominatimViewbox,
  photonSearchTag,
  type NominatimPoi,
} from "../nominatimGeocoder";

/**
 * Live business search via OpenStreetMap.
 * Free, no API key. Data is public map data – not Google.
 *
 * Nominatim tag search is the reliable path (1 req/s). Overpass is tried when
 * Nominatim returns nothing; public Overpass instances are often at capacity.
 *
 * What OSM does provide: name, address, coordinates, phone, website, hours (when mapped).
 * What OSM does NOT provide: ratings, review counts. Those stay Unknown.
 */

const OVERPASS_URLS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const USER_AGENT = "MKStudiosDashboard/1.0 (https://mkstudios; lead finder)";
const MAX_INDUSTRIES = 6;
const MAX_RESULTS = 80;

/** OSM tags per dashboard industry. Only real tags – no invented categories. */
const INDUSTRY_TAGS: Record<string, { k: string; v: string }[]> = {
  "Auto Detailing": [
    { k: "shop", v: "car_wash" },
    { k: "amenity", v: "car_wash" },
  ],
  "Auto Repair": [{ k: "shop", v: "car_repair" }],
  Roofing: [{ k: "craft", v: "roofer" }],
  Plumbing: [{ k: "craft", v: "plumber" }],
  Electrical: [{ k: "craft", v: "electrician" }],
  Landscaping: [
    { k: "craft", v: "gardener" },
    { k: "shop", v: "garden_centre" },
  ],
  Construction: [
    { k: "craft", v: "builder" },
    { k: "office", v: "construction_company" },
  ],
  Dental: [{ k: "amenity", v: "dentist" }],
  "Med Spa": [
    { k: "amenity", v: "spa" },
    { k: "shop", v: "beauty" },
  ],
  Restaurants: [{ k: "amenity", v: "restaurant" }],
  Hotels: [{ k: "tourism", v: "hotel" }],
  Barbers: [
    { k: "shop", v: "hairdresser" },
    { k: "shop", v: "barber" },
  ],
  Beauty: [
    { k: "shop", v: "beauty" },
    { k: "shop", v: "cosmetics" },
  ],
  Gyms: [
    { k: "leisure", v: "fitness_centre" },
    { k: "leisure", v: "sports_centre" },
  ],
  "Real Estate": [{ k: "office", v: "estate_agent" }],
  Photography: [
    { k: "shop", v: "photo" },
    { k: "craft", v: "photographer" },
  ],
  Cleaning: [
    { k: "craft", v: "cleaner" },
    { k: "office", v: "cleaning_agency" },
  ],
};

const DEFAULT_INDUSTRIES = ["Plumbing", "Electrical", "Roofing", "Auto Repair", "Dental", "Construction", "Landscaping", "Cleaning"];

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function tag(tags: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = tags[key]?.trim();
    if (value) return value;
  }
  return "";
}

function asWebsite(raw: string): string | null {
  if (!raw) return null;
  const url = raw.startsWith("http") ? raw : `https://${raw}`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function estimateSpending(industry: string): SpendingPotential {
  const value = industryValue(industry);
  if (value === "high") return "medium";
  if (value === "medium") return "medium";
  return "low";
}

function estimateSize(): BusinessSize {
  return "small";
}

function industryForTags(tags: Record<string, string>, preferred: string): string {
  if (preferred && preferred !== "Other") return preferred;
  for (const [industry, pairs] of Object.entries(INDUSTRY_TAGS)) {
    if (pairs.some((p) => tags[p.k] === p.v)) return industry;
  }
  return preferred || "Other";
}

function toBusiness(
  el: OsmElement,
  selectedIndustries: string[],
  fallbackCity: string,
  fallbackRegion: string,
  fallbackCountry: string,
): Business | null {
  const tags = el.tags ?? {};
  const name = tag(tags, "name", "name:en", "name:nl");
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!name || lat === undefined || lng === undefined) return null;
  if (tags.disused === "yes" || tags.opening_hours === "closed") return null;

  const house = tag(tags, "addr:housenumber");
  const street = tag(tags, "addr:street");
  const address = [house, street].filter(Boolean).join(" ") || tag(tags, "addr:full");
  const industry = industryForTags(tags, selectedIndustries[0] ?? "Other");
  const matched = selectedIndustries.find((industryName) => (INDUSTRY_TAGS[industryName] ?? []).some((p) => tags[p.k] === p.v));
  const size = estimateSize();
  const countryTag = tag(tags, "addr:country");

  return {
    id: `osm_${el.type}_${el.id}`,
    externalId: `${el.type}/${el.id}`,
    source: "openstreetmap",
    name: name.slice(0, 300),
    industry: matched || industry,
    description: tag(tags, "description") || null,
    address,
    city: tag(tags, "addr:city", "addr:town", "addr:village") || fallbackCity,
    region: tag(tags, "addr:state", "addr:province") || fallbackRegion,
    country: countryTag.length > 2 ? countryTag : fallbackCountry,
    countryCode: countryTag.length === 2 ? countryTag.toUpperCase() : "",
    phone: tag(tags, "phone", "contact:phone", "mobile") || null,
    email: tag(tags, "email", "contact:email") || null,
    website: asWebsite(tag(tags, "website", "contact:website", "url")),
    rating: null,
    reviewCount: 0,
    lat,
    lng,
    openingHours: tag(tags, "opening_hours") ? [tag(tags, "opening_hours")] : [],
    services: tag(tags, "service") ? [tag(tags, "service")] : [],
    socials: {
      facebook: asWebsite(tag(tags, "contact:facebook", "facebook")) || undefined,
      instagram: asWebsite(tag(tags, "contact:instagram", "instagram")) || undefined,
      linkedin: asWebsite(tag(tags, "contact:linkedin")) || undefined,
    },
    size,
    spendingPotential: estimateSpending(industry),
  };
}

function buildQuery(lat: number, lng: number, radiusM: number, industries: string[]): string {
  const clauses: string[] = [];
  for (const industry of industries) {
    for (const { k, v } of INDUSTRY_TAGS[industry] ?? []) {
      clauses.push(`  nwr["${k}"="${v}"](around:${radiusM},${lat.toFixed(5)},${lng.toFixed(5)});`);
    }
  }
  return `[out:json][timeout:25];\n(\n${clauses.join("\n")}\n);\nout center tags ${MAX_RESULTS};`;
}

async function runOverpass(query: string): Promise<OsmElement[]> {
  let lastError = "Overpass request failed";
  for (const endpoint of OVERPASS_URLS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "User-Agent": USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      });
      if (!res.ok) {
        lastError = `OpenStreetMap error ${res.status}`;
        continue;
      }
      const data = (await res.json()) as { elements?: OsmElement[] };
      return data.elements ?? [];
    } catch (e) {
      lastError = e instanceof Error ? e.message : lastError;
    }
  }
  throw new Error(`${lastError}. Try again in a moment.`);
}

export const osmBusinessProvider: BusinessProvider = {
  id: "openstreetmap",
  label: "OpenStreetMap",
  isConnected: () => true,

  async search(filters: SearchFilters) {
    const location = [filters.city, filters.region, filters.country].filter(Boolean).join(", ");
    if (!location) throw new Error("Enter at least a city (for example Amsterdam or Miami).");

    const center = await nominatimGeocoder.geocode(location);
    if (!center) throw new Error(`Could not find "${location}". Try a city name that exists on the map.`);

    const industries = (filters.industries.length > 0 ? filters.industries : DEFAULT_INDUSTRIES)
      .filter((i) => i in INDUSTRY_TAGS)
      .slice(0, MAX_INDUSTRIES);
    if (industries.length === 0) {
      throw new Error("Pick at least one industry from the list (custom names are not in OpenStreetMap).");
    }

    const radiusKm = Math.min(Math.max(filters.radiusKm, 1), 50);
    const radiusM = Math.round(radiusKm * 1000);
    const tags = industries.flatMap((industry) => INDUSTRY_TAGS[industry] ?? []);
    const viewbox = nominatimViewbox(center, radiusKm);

    const found = new Map<string, Business>();
    const addPoi = (poi: NominatimPoi) => {
      const business = toBusiness(
        { type: poi.osmType, id: poi.osmId, lat: poi.lat, lon: poi.lng, tags: poi.tags },
        industries,
        poi.address.city || filters.city,
        poi.address.region || filters.region,
        poi.address.country || filters.country,
      );
      if (!business || found.has(business.externalId)) return;
      found.set(business.externalId, business);
    };

    // 1. Nominatim tag search – indexed OSM POIs, includes phone/website when mapped.
    for (const tag of tags) {
      try {
        (await nominatimSearchTag(tag, viewbox, 40)).forEach(addPoi);
      } catch {
        // Try the next tag; Photon / Overpass below if this stays empty.
      }
    }

    // 2. Photon fills gaps (same OSM tags, different index). Lookup extra tags in one Nominatim call.
    if (found.size < 12) {
      const photonPois: NominatimPoi[] = [];
      for (const tag of tags) {
        try {
          photonPois.push(...(await photonSearchTag(tag, center, radiusKm, `${tag.v} ${filters.city}`)));
        } catch {
          /* Photon is optional */
        }
      }
      const missing = photonPois.filter((p) => !found.has(`${p.osmType}/${p.osmId}`));
      if (missing.length > 0) {
        try {
          const lookedUp = await nominatimLookup(missing);
          const byId = new Map(lookedUp.map((p) => [`${p.osmType}/${p.osmId}`, p]));
          for (const poi of missing) addPoi(byId.get(`${poi.osmType}/${poi.osmId}`) ?? poi);
        } catch {
          missing.forEach(addPoi);
        }
      }
    }

    // 3. Overpass is more complete, but public servers are often full. Only if still empty.
    if (found.size === 0) {
      try {
        const elements = await runOverpass(buildQuery(center.lat, center.lng, radiusM, industries));
        for (const el of elements) {
          const business = toBusiness(el, industries, filters.city, filters.region, filters.country);
          if (!business || found.has(business.externalId)) continue;
          found.set(business.externalId, business);
        }
      } catch {
        /* Nominatim/Photon already tried */
      }
    }

    if (found.size === 0) {
      throw new Error("No OpenStreetMap businesses found for this city and industry. Try another city, a larger radius, or a different industry.");
    }

    const businesses = [...found.values()].filter((b) =>
      matchesFilters(b, null, { ...filters, country: "", region: "" }, center, {
        includeUnanalyzed: true,
        skipReviewFilters: true,
        skipEstimatedFilters: true,
      }),
    );

    const notes: string[] = [
      "Bron: OpenStreetMap. Geen sterren of reviews, dus die filters zijn niet gebruikt. Grootte en budget zijn een schatting. Dekking hangt af van wat op de kaart staat.",
    ];
    if (filters.industries.length === 0) notes.push("No industry selected – searched common local service businesses.");
    if (filters.websiteIssues.some((i) => i !== "no_website")) {
      notes.push("Website problem filters (except “no website”) apply after you analyze a website.");
    }
    if (filters.minRating > 0 || filters.minReviews > 0) {
      notes.push("Minimum rating/reviews were ignored because this source has no review data.");
    }
    if (filters.sizes.length > 0 || filters.spending.length > 0) {
      notes.push("Size and spending filters were ignored because those fields are estimates, not measured data.");
    }

    return {
      provider: "openstreetmap",
      providerLabel: "OpenStreetMap",
      businesses: businesses.slice(0, MAX_RESULTS),
      audits: [],
      notice: notes.join(" "),
    };
  },
};
