import { buildDemoAudit } from "../../demo/demoAudit";
import { DEMO_BUSINESSES } from "../../demo/demoBusinesses";
import type { WebsiteAnalyzer } from "../websiteAnalyzer";

/**
 * Demo analyzer: returns the predefined FICTIONAL audit for a demo business.
 * It never fetches the URL. For non-demo businesses it returns null
 * ("analyzer not connected") instead of making something up.
 */
export const demoWebsiteAnalyzer: WebsiteAnalyzer = {
  label: "Demo analyzer (fictional results)",
  isConnected: () => false,

  async analyze({ businessId, url }) {
    const business = DEMO_BUSINESSES.find((b) => b.id === businessId);
    if (!business || !business.demoWebsite || business.website !== url) return null;
    return buildDemoAudit(business.id, url, business.demoWebsite.issues, business.phone);
  },
};
