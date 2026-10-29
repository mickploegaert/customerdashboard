import { buildDemoAudit } from "../../demo/demoAudit";
import { DEMO_BUSINESSES, toBusiness } from "../../demo/demoBusinesses";
import { matchesFilters } from "../../search";
import type { WebsiteAudit } from "../../types";
import type { BusinessProvider } from "../businessProvider";
import { demoGeocoder } from "../mapsProvider";

/** Audits for demo businesses whose website is marked as "already analyzed". */
export function getInitialDemoAudits(): WebsiteAudit[] {
  return DEMO_BUSINESSES.filter((b) => b.website && b.demoWebsite?.analyzed).map((b) =>
    buildDemoAudit(b.id, b.website!, b.demoWebsite!.issues, b.phone),
  );
}

/**
 * Demo provider: filters the fictional demo dataset. It does NOT contact any
 * external service and the response is clearly labelled as demo data.
 */
export const demoBusinessProvider: BusinessProvider = {
  id: "demo",
  label: "Demo dataset (fictional businesses)",
  isConnected: () => false,

  async search(filters) {
    const audits = getInitialDemoAudits();
    const auditById = new Map(audits.map((a) => [a.businessId, a]));

    let center = null;
    let notice: string | null = null;
    if (filters.city.trim()) {
      center = await demoGeocoder.geocode(filters.city);
      if (!center) {
        notice = `"${filters.city}" is not in the demo dataset, so the radius filter was not applied. Matching on city name only.`;
      }
    }

    const businesses = DEMO_BUSINESSES.map(toBusiness).filter((b) =>
      matchesFilters(b, auditById.get(b.id) ?? null, filters, center),
    );

    return {
      provider: "demo",
      providerLabel: this.label,
      businesses,
      audits: audits.filter((a) => businesses.some((b) => b.id === a.businessId)),
      notice,
    };
  },
};
