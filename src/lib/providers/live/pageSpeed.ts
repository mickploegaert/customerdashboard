import "server-only";

/**
 * Google PageSpeed Insights (Lighthouse, mobile).
 * Returns real measured performance data and a real screenshot.
 * Only used when PAGESPEED_API_KEY is set.
 */
export interface PageSpeedResult {
  performanceScore: number | null; // 0–100
  lcpMs: number | null;
  viewportOk: boolean | null;
  fontSizeOk: boolean | null;
  screenshot: string | null; // data:image/jpeg;base64,...
}

export async function runPageSpeed(url: string, apiKey: string): Promise<PageSpeedResult | null> {
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.set("key", apiKey);

  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(60_000), cache: "no-store" });
    if (!res.ok) return null;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const data = (await res.json()) as any;
    const lh = data.lighthouseResult;
    if (!lh) return null;
    const audit = (id: string) => lh.audits?.[id];
    const screenshot = audit("final-screenshot")?.details?.data;
    const perf = lh.categories?.performance?.score;
    const scoreOf = (id: string) => (typeof audit(id)?.score === "number" ? audit(id).score >= 0.9 : null);
    return {
      performanceScore: typeof perf === "number" ? Math.round(perf * 100) : null,
      lcpMs: typeof audit("largest-contentful-paint")?.numericValue === "number" ? Math.round(audit("largest-contentful-paint").numericValue) : null,
      viewportOk: scoreOf("viewport"),
      fontSizeOk: scoreOf("font-size"),
      // Only accept an inline JPEG/PNG/WebP data URL – nothing else is rendered.
      screenshot: typeof screenshot === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(screenshot) ? screenshot : null,
    };
  } catch {
    return null;
  }
}
