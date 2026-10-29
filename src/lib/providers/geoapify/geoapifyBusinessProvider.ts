import "server-only";

import { industryValue } from "../../constants";
import { matchesFilters } from "../../search";
import type { Business, BusinessSize, SearchFilters, SpendingPotential } from "../../types";
import type { BusinessProvider } from "../businessProvider";
import type { Coordinates } from "../mapsProvider";
import { osmBusinessProvider } from "../osm/osmBusinessProvider";

/**
 * Geoapify Places API. Server-side only; the key never reaches the browser.
 * https://apidocs.geoapify.com/docs/places/
 *
 * Results are OpenStreetMap places indexed by Geoapify. There are no Google
 * ratings or review counts. Categories that Geoapify does not offer are
 * searched through OpenStreetMap directly and labelled as such.
 */

const PLACES_URL = "https://api.geoapify.com/v2/places";
const GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search";
const MAX_INDUSTRIES = 6;
const LIMIT_PER_INDUSTRY = 20;

/**
 * Only categories that the Places API actually accepts.
 * Plumbing, roofing, construction and landscaping are not in that list.
 */
const INDUSTRY_CATEGORIES: Record<string, string[]> = {
  "Auto Detailing": ["service.vehicle.car_wash"],
  "Auto Repair": ["service.vehicle.repair.car"],
  Electrical: ["service.electrician"],
  Dental: ["healthcare.dentist"],
  "Med Spa": ["service.beauty.spa", "leisure.spa"],
  Restaurants: ["catering.restaurant"],
  Hotels: ["accommodation.hotel"],
  Barbers: ["service.beauty.hairdresser"],
  Beauty: ["commercial.health_and_beauty", "service.beauty"],
  Gyms: ["sport.fitness.fitness_centre", "sport.fitness.gym"],
  "Real Estate": ["office.estate_agent", "service.estate_agent"],
  Photography: ["service.photographer", "commercial.hobby.photo"],
};

const DEFAULT_INDUSTRIES = ["Electrical", "Dental", "Restaurants", "Auto Repair", "Barbers", "Real Estate"];

interface GeoFeature {
  properties?: Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
  if (value === "low") return "low";
  return "medium";
}

function estimateSize(): BusinessSize {
  return "small";
}

function industryForCategories(categories: string[], selected: string[]): string {
  for (const industry of selected) {
    const wanted = INDUSTRY_CATEGORIES[industry] ?? [];
    const hit = categories.some((category) => wanted.some((name) => category === name || category.startsWith(`${name}.`)));
    if (hit) return industry;
  }
  return selected[0] ?? "Other";
}

function toBusiness(properties: Record<string, unknown>, industries: string[]): Business | null {
  const name = text(properties.name);
  const lat = typeof properties.lat === "number" ? properties.lat : Number(properties.lat);
  const lng = typeof properties.lon === "number" ? properties.lon : Number(properties.lon);
  const placeId = text(properties.place_id);
  if (!name || !placeId || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const raw = (properties.datasource as { raw?: Record<string, string> } | undefined)?.raw ?? {};
  const contact = (properties.contact as { phone?: string; email?: string } | undefined) ?? {};
  const categories = Array.isArray(properties.categories) ? properties.categories.filter((c): c is string => typeof c === "string") : [];
  const industry = industryForCategories(categories, industries);
  const countryCode = text(properties.country_code).toUpperCase();
  const hours = text(properties.opening_hours) || text(raw.opening_hours);

  return {
    id: `geo_${placeId.slice(0, 80)}`,
    externalId: placeId,
    source: "geoapify",
    name: name.slice(0, 300),
    industry,
    description: null,
    address: [text(properties.housenumber), text(properties.street)].filter(Boolean).join(" ") || text(properties.address_line1),
    city: text(properties.city) || text(properties.county),
    region: text(properties.state),
    country: text(properties.country),
    countryCode,
    phone: text(contact.phone) || text(raw.phone) || text(raw["contact:phone"]) || null,
    email: text(contact.email) || text(raw.email) || text(raw["contact:email"]) || null,
    website: asWebsite(text(properties.website) || text(raw.website) || text(raw["contact:website"])),
    rating: null,
    reviewCount: 0,
    lat,
    lng,
    openingHours: hours ? [hours] : [],
    services: [],
    socials: {},
    size: estimateSize(),
    spendingPotential: estimateSpending(industry),
  };
}

async function geoapifyGet(url: URL, apiKey: string): Promise<unknown> {
  url.searchParams.set("apiKey", apiKey);
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as { message?: string; features?: GeoFeature[] };
  if (!res.ok) {
    const message = text(data.message) || `Geoapify error ${res.status}`;
    throw new Error(message.slice(0, 240));
  }
  return data;
}

async function geocode(apiKey: string, query: string): Promise<Coordinates | null> {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("text", query.slice(0, 200));
  url.searchParams.set("limit", "1");
  const data = (await geoapifyGet(url, apiKey)) as { features?: GeoFeature[] };
  const p = data.features?.[0]?.properties;
  if (!p) return null;
  const lat = Number(p.lat);
  const lng = Number(p.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function searchCategory(apiKey: string, categories: string[], center: Coordinates, radiusM: number): Promise<GeoFeature[]> {
  const url = new URL(PLACES_URL);
  url.searchParams.set("categories", categories.join(","));
  url.searchParams.set("filter", `circle:${center.lng.toFixed(5)},${center.lat.toFixed(5)},${radiusM}`);
  url.searchParams.set("bias", `proximity:${center.lng.toFixed(5)},${center.lat.toFixed(5)}`);
  url.searchParams.set("limit", String(LIMIT_PER_INDUSTRY));
  const data = (await geoapifyGet(url, apiKey)) as { features?: GeoFeature[] };
  return data.features ?? [];
}

export function createGeoapifyProvider(apiKey: string): BusinessProvider {
  return {
    id: "geoapify",
    label: "Geoapify",
    isConnected: () => true,

    async search(filters: SearchFilters) {
      const location = [filters.city, filters.region, filters.country].filter(Boolean).join(", ");
      if (!location) throw new Error("Enter at least a city (for example Amsterdam or Miami).");

      const requested = (filters.industries.length > 0 ? filters.industries : DEFAULT_INDUSTRIES).slice(0, MAX_INDUSTRIES);
      const mapped = requested.filter((name) => (INDUSTRY_CATEGORIES[name] ?? []).length > 0);
      const unmapped = requested.filter((name) => !mapped.includes(name));

      const center = await geocode(apiKey, location);
      if (!center && mapped.length > 0 && unmapped.length === 0) {
        throw new Error(`Could not find "${location}". Try a city name that exists on the map.`);
      }

      const found = new Map<string, Business>();
      if (center && mapped.length > 0) {
        const radiusM = Math.round(Math.min(Math.max(filters.radiusKm, 1), 50) * 1000);
        const batches = await Promise.all(
          mapped.map(async (industry) => {
            const features = await searchCategory(apiKey, INDUSTRY_CATEGORIES[industry], center, radiusM);
            return features.map((feature) => toBusiness(feature.properties ?? {}, [industry])).filter((b): b is Business => b !== null);
          }),
        );
        for (const business of batches.flat()) {
          if (!found.has(business.externalId)) found.set(business.externalId, business);
        }
      }

      let osmNotice: string | null = null;
      if (unmapped.length > 0) {
        try {
          const osm = await osmBusinessProvider.search({ ...filters, industries: unmapped });
          osmNotice = osm.notice;
          for (const business of osm.businesses) {
            if (!found.has(business.externalId)) found.set(business.externalId, business);
          }
        } catch (error) {
          if (found.size === 0) throw error;
          osmNotice = error instanceof Error ? error.message : "OpenStreetMap search failed for industries Geoapify does not categorize.";
        }
      }

      const businesses = [...found.values()].filter((b) =>
        matchesFilters(b, null, { ...filters, country: "", region: "" }, center, {
          includeUnanalyzed: true,
          skipReviewFilters: true,
          skipEstimatedFilters: true,
        }),
      );

      if (businesses.length === 0) {
        throw new Error("No businesses found for this city and industry. Try a larger radius or another industry.");
      }

      const notes = [
        "Bron: Geoapify. Dit zijn openbare kaartplaatsen, geen Google. Sterren en reviews ontbreken, dus die filters zijn niet gebruikt. Grootte en budget zijn een schatting.",
      ];
      if (filters.industries.length === 0) notes.push("Geen branche gekozen, daarom is een korte lijst doorzocht.");
      if (unmapped.length > 0) {
        notes.push(`${unmapped.join(", ")} ${unmapped.length === 1 ? "heeft" : "hebben"} geen Geoapify-categorie. Die ${unmapped.length === 1 ? "komt" : "komen"} uit OpenStreetMap.`);
      }
      if (filters.websiteIssues.some((i) => i !== "no_website")) {
        notes.push("Websitefilters (behalve “geen website”) gelden pas nadat je een site bekijkt.");
      }
      if (filters.minRating > 0 || filters.minReviews > 0) notes.push("Minimale score en reviews zijn genegeerd, want deze bron heeft geen reviews.");
      if (filters.sizes.length > 0 || filters.spending.length > 0) notes.push("Grootte- en budgetfilters zijn genegeerd, want dat zijn schattingen.");
      if (osmNotice && unmapped.length > 0 && mapped.length === 0) notes.push(osmNotice);

      const provider = businesses.some((b) => b.source === "geoapify") ? "geoapify" : "openstreetmap";
      return {
        provider,
        providerLabel: provider === "geoapify" ? "Geoapify" : "OpenStreetMap",
        businesses: businesses.slice(0, 80),
        audits: [],
        notice: notes.join(" "),
      };
    },
  };
}
