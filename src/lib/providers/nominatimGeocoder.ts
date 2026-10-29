import "server-only";

import type { Coordinates, Geocoder } from "./mapsProvider";

/**
 * OpenStreetMap Nominatim (free, no API key).
 * Usage policy: max 1 request/second and an identifying User-Agent.
 * https://operations.osmfoundation.org/policies/nominatim/
 */

const cache = new Map<string, Coordinates | null>();
let lastRequest = 0;

export interface NominatimPoi {
  osmType: "node" | "way" | "relation";
  osmId: number;
  lat: number;
  lng: number;
  name: string;
  tags: Record<string, string>;
  address: {
    house?: string;
    street?: string;
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
  };
}

function userAgent(): string {
  return `MKStudiosDashboard/1.0 (${process.env.CONTACT_EMAIL || "lead-finder"})`;
}

async function nominatimGet(url: URL): Promise<unknown> {
  const wait = 1100 - (Date.now() - lastRequest);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();

  const res = await fetch(url, {
    headers: {
      "User-Agent": userAgent(),
      Accept: "application/json",
      "Accept-Language": "en",
    },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Nominatim error ${res.status}`);
  return res.json();
}

function asOsmType(value: string | undefined): "node" | "way" | "relation" | null {
  const v = (value ?? "").toLowerCase();
  if (v === "node" || v === "n") return "node";
  if (v === "way" || v === "w") return "way";
  if (v === "relation" || v === "r") return "relation";
  return null;
}

interface NominatimRow {
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  class?: string;
  type?: string;
  extratags?: Record<string, string> | null;
  address?: Record<string, string>;
}

function rowToPoi(row: NominatimRow): NominatimPoi | null {
  const osmType = asOsmType(row.osm_type);
  const osmId = Number(row.osm_id);
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  const name = (row.name || row.address?.craft || row.address?.amenity || row.address?.shop || "").trim();
  if (!osmType || !Number.isFinite(osmId) || !Number.isFinite(lat) || !Number.isFinite(lng) || !name) return null;

  const extra = row.extratags ?? {};
  const tags: Record<string, string> = { ...extra };
  if (row.class && row.type) tags[row.class] = row.type;
  if (row.name) tags.name = row.name;
  const addr = row.address ?? {};
  if (addr.house_number) tags["addr:housenumber"] = addr.house_number;
  if (addr.road) tags["addr:street"] = addr.road;
  if (addr.city || addr.town || addr.village) tags["addr:city"] = addr.city || addr.town || addr.village;
  if (addr.state) tags["addr:state"] = addr.state;
  if (addr.country_code && addr.country_code.length === 2) tags["addr:country"] = addr.country_code;
  else if (addr.country) tags["addr:country"] = addr.country;

  return {
    osmType,
    osmId,
    lat,
    lng,
    name,
    tags,
    address: {
      house: addr.house_number,
      street: addr.road,
      city: addr.city || addr.town || addr.village,
      region: addr.state,
      country: addr.country,
      countryCode: addr.country_code?.toUpperCase(),
    },
  };
}

/** Bounding box around a point: left,top,right,bottom (Nominatim viewbox). */
export function nominatimViewbox(center: Coordinates, radiusKm: number): string {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)));
  return `${(center.lng - dLng).toFixed(5)},${(center.lat + dLat).toFixed(5)},${(center.lng + dLng).toFixed(5)},${(center.lat - dLat).toFixed(5)}`;
}

export function photonBbox(center: Coordinates, radiusKm: number): string {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)));
  return `${(center.lng - dLng).toFixed(5)},${(center.lat - dLat).toFixed(5)},${(center.lng + dLng).toFixed(5)},${(center.lat + dLat).toFixed(5)}`;
}

/** Tag search, e.g. [craft=plumber], clipped to a map viewbox. */
export async function nominatimSearchTag(tag: { k: string; v: string }, viewbox: string, limit = 30): Promise<NominatimPoi[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", `[${tag.k}=${tag.v}]`);
  url.searchParams.set("viewbox", viewbox);
  url.searchParams.set("bounded", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("limit", String(Math.min(50, Math.max(1, limit))));
  const contact = process.env.CONTACT_EMAIL;
  if (contact) url.searchParams.set("email", contact);

  const data = (await nominatimGet(url)) as NominatimRow[];
  if (!Array.isArray(data)) return [];
  return data.map(rowToPoi).filter((p): p is NominatimPoi => p !== null);
}

/** Fill in phone/website for OSM ids that Photon found without extra tags. */
export async function nominatimLookup(ids: { osmType: string; osmId: number }[]): Promise<NominatimPoi[]> {
  if (ids.length === 0) return [];
  const osmIds = ids
    .map((id) => {
      const t = asOsmType(id.osmType);
      if (!t) return null;
      return `${t[0]!.toUpperCase()}${id.osmId}`;
    })
    .filter(Boolean)
    .slice(0, 50)
    .join(",");
  if (!osmIds) return [];

  const url = new URL("https://nominatim.openstreetmap.org/lookup");
  url.searchParams.set("format", "json");
  url.searchParams.set("osm_ids", osmIds);
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  const contact = process.env.CONTACT_EMAIL;
  if (contact) url.searchParams.set("email", contact);

  const data = (await nominatimGet(url)) as NominatimRow[];
  if (!Array.isArray(data)) return [];
  return data.map(rowToPoi).filter((p): p is NominatimPoi => p !== null);
}

export async function photonSearchTag(tag: { k: string; v: string }, center: Coordinates, radiusKm: number, query: string): Promise<NominatimPoi[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query.slice(0, 80) || tag.v);
  url.searchParams.set("lat", String(center.lat));
  url.searchParams.set("lon", String(center.lng));
  url.searchParams.set("limit", "40");
  url.searchParams.set("osm_tag", `${tag.k}:${tag.v}`);
  url.searchParams.set("bbox", photonBbox(center, radiusKm));
  url.searchParams.set("lang", "en");

  const res = await fetch(url, {
    headers: { "User-Agent": userAgent(), Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features?: {
      geometry?: { coordinates?: [number, number] };
      properties?: {
        osm_type?: string;
        osm_id?: number;
        name?: string;
        street?: string;
        housenumber?: string;
        city?: string;
        state?: string;
        country?: string;
        countrycode?: string;
        osm_key?: string;
        osm_value?: string;
      };
    }[];
  };

  const pois: NominatimPoi[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties ?? {};
    const osmType = asOsmType(p.osm_type);
    const coords = f.geometry?.coordinates;
    const name = (p.name ?? "").trim();
    if (!osmType || !p.osm_id || !coords || !name) continue;
    const tags: Record<string, string> = { name };
    if (p.osm_key && p.osm_value) tags[p.osm_key] = p.osm_value;
    if (p.housenumber) tags["addr:housenumber"] = p.housenumber;
    if (p.street) tags["addr:street"] = p.street;
    if (p.city) tags["addr:city"] = p.city;
    if (p.state) tags["addr:state"] = p.state;
    if (p.countrycode) tags["addr:country"] = p.countrycode;
    pois.push({
      osmType,
      osmId: p.osm_id,
      lat: coords[1],
      lng: coords[0],
      name,
      tags,
      address: {
        house: p.housenumber,
        street: p.street,
        city: p.city,
        region: p.state,
        country: p.country,
        countryCode: p.countrycode?.toUpperCase(),
      },
    });
  }
  return pois;
}

export const nominatimGeocoder: Geocoder = {
  label: "OpenStreetMap Nominatim",
  isConnected: () => true,

  async geocode(query) {
    const key = query.trim().toLowerCase();
    if (!key) return null;
    if (cache.has(key)) return cache.get(key)!;

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", query.slice(0, 200));
    const contact = process.env.CONTACT_EMAIL;
    if (contact) url.searchParams.set("email", contact);

    try {
      const data = (await nominatimGet(url)) as { lat: string; lon: string }[];
      const result = data[0] ? { lat: Number(data[0].lat), lng: Number(data[0].lon) } : null;
      cache.set(key, result);
      return result;
    } catch {
      return null;
    }
  },
};
