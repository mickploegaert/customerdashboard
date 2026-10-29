import type { Business, SearchFilters, SearchResponse } from "../types";
import { demoBusinessProvider } from "./demo/demoBusinessProvider";

/**
 * Business data provider interface.
 *
 * Any data source (Google Places, Yelp, OpenStreetMap, ...) must implement
 * this interface. Routes only call `getBusinessProvider()`, so swapping
 * providers means adding one file and changing that function.
 *
 * Server-side only: real providers need API keys, which must never reach the browser.
 */
export interface BusinessProvider {
  readonly id: Business["source"];
  readonly label: string;
  /** true when the provider can actually return results. */
  isConnected(): boolean;
  search(filters: SearchFilters): Promise<SearchResponse>;
}

export async function getBusinessProvider(): Promise<BusinessProvider> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "false") return demoBusinessProvider;
  const geoapifyKey = process.env.GEOAPIFY_API_KEY;
  if (geoapifyKey) {
    const { createGeoapifyProvider } = await import("./geoapify/geoapifyBusinessProvider");
    return createGeoapifyProvider(geoapifyKey);
  }
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  if (googleKey) {
    const { createGooglePlacesProvider } = await import("./google/googlePlacesProvider");
    return createGooglePlacesProvider(googleKey);
  }
  const { osmBusinessProvider } = await import("./osm/osmBusinessProvider");
  return osmBusinessProvider;
}
