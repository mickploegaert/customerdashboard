import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/config";
import { getWebsiteAnalyzer } from "@/lib/providers/websiteAnalyzer";
import { getBusinessById, saveAudit } from "@/lib/server/businessRepository";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { getRequestUser } from "@/lib/supabase/server";
import { parseWebsiteUrl } from "@/lib/validation";

/**
 * POST /api/analyze-website  { businessId, url, city?, phone? }
 * Website analysis always runs server-side. The response only contains
 * structured results – never raw HTML from the external website.
 */
export async function POST(request: Request) {
  const auth = await getRequestUser();
  if (!auth.allowed) return NextResponse.json({ error: "Log eerst in." }, { status: 401 });

  const limit = rateLimit(`analyze:${auth.user?.id ?? clientIp(request)}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Te veel analyses. Wacht even." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const businessId = typeof body.businessId === "string" ? body.businessId.slice(0, 100) : "";
  let url = parseWebsiteUrl(body.url);
  let city = typeof body.city === "string" ? body.city.slice(0, 100) : undefined;
  let phone = typeof body.phone === "string" ? body.phone.slice(0, 40) : null;
  if (!businessId || !url) {
    return NextResponse.json({ error: "A valid businessId and public http(s) URL are required." }, { status: 400 });
  }

  // Supabase mode: only analyze the website that belongs to the stored business.
  if (isSupabaseEnabled && !businessId.startsWith("demo-")) {
    const business = await getBusinessById(businessId).catch(() => null);
    if (!business?.website) return NextResponse.json({ error: "Business not found." }, { status: 404 });
    url = parseWebsiteUrl(business.website);
    city = business.city;
    phone = business.phone;
    if (!url) return NextResponse.json({ error: "This business has no valid website URL." }, { status: 400 });
  }

  const analyzer = await getWebsiteAnalyzer(businessId);
  try {
    const audit = await analyzer.analyze({ businessId, url, city, phone });
    if (!audit) {
      return NextResponse.json({ error: "Website analyzer not available for this business.", connected: false }, { status: 501 });
    }
    if (isSupabaseEnabled && audit.source === "live") await saveAudit(audit);
    return NextResponse.json({ audit, analyzer: analyzer.label });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    if (message === "Blocked host") return NextResponse.json({ error: "This address is not allowed." }, { status: 400 });
    console.error("Analysis failed:", message);
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 502 });
  }
}
