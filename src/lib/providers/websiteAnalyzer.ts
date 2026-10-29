import type { WebsiteAudit } from "../types";
import { demoWebsiteAnalyzer } from "./demo/demoWebsiteAnalyzer";

/**
 * Website analyzer interface.
 *
 * Rules for every implementation:
 * - Never invent data. If a check can't be measured, return status "unknown".
 * - Mark checks as "verified" (measured) or "estimated" (heuristic/judgement).
 * - Never return raw HTML from the external site to the client.
 */
export interface AnalyzeInput {
  businessId: string;
  url: string;
  city?: string;
  phone?: string | null;
}

export interface WebsiteAnalyzer {
  readonly label: string;
  isConnected(): boolean;
  analyze(input: AnalyzeInput): Promise<WebsiteAudit | null>;
}

/** Demo businesses get the fictional demo audit; everything else is analyzed live. */
export async function getWebsiteAnalyzer(businessId: string): Promise<WebsiteAnalyzer> {
  if (businessId.startsWith("demo-")) return demoWebsiteAnalyzer;
  const { liveWebsiteAnalyzer } = await import("./live/liveWebsiteAnalyzer");
  return liveWebsiteAnalyzer;
}
