/**
 * Maps provider: tile layer settings and geocoding.
 *
 * Tiles are rendered client-side with Leaflet. Map data © OpenStreetMap
 * contributors; the dark basemap style is provided by CARTO.
 */
export interface MapTileConfig {
  url: string;
  attribution: string;
  maxZoom: number;
}

const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const mapTiles: MapTileConfig = {
  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution: MAP_ATTRIBUTION,
  maxZoom: 19,
};

export const mapTilesLight: MapTileConfig = {
  url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  attribution: MAP_ATTRIBUTION,
  maxZoom: 19,
};

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Geocoder {
  readonly label: string;
  isConnected(): boolean;
  geocode(query: string): Promise<Coordinates | null>;
}

/**
 * Demo geocoder: only knows the cities that appear in the demo dataset.
 * Phase 3 will add a real geocoder (e.g. OpenStreetMap Nominatim, server-side).
 */
const DEMO_CITY_CENTERS: Record<string, Coordinates> = {
  miami: { lat: 25.7617, lng: -80.1918 },
  "fort lauderdale": { lat: 26.1224, lng: -80.1373 },
  austin: { lat: 30.2672, lng: -97.7431 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  rotterdam: { lat: 51.9244, lng: 4.4777 },
  utrecht: { lat: 52.0907, lng: 5.1214 },
  london: { lat: 51.5072, lng: -0.1276 },
  manchester: { lat: 53.4808, lng: -2.2426 },
  berlin: { lat: 52.52, lng: 13.405 },
  munich: { lat: 48.1351, lng: 11.582 },
  antwerp: { lat: 51.2194, lng: 4.4025 },
};

export const demoGeocoder: Geocoder = {
  label: "Demo geocoder (demo cities only)",
  isConnected: () => false,
  async geocode(query) {
    return DEMO_CITY_CENTERS[query.trim().toLowerCase()] ?? null;
  },
};

/** Distance between two coordinates in kilometres (haversine formula). */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
