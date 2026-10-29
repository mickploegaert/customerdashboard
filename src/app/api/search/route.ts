import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/config";
import { getBusinessProvider } from "@/lib/providers/businessProvider";
import { persistBusinesses } from "@/lib/server/businessRepository";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { getRequestUser } from "@/lib/supabase/server";
import { parseSearchFilters } from "@/lib/validation";

/**
 * POST /api/search
 * Runs a business search on the server so provider API keys stay secret.
 * In Supabase mode the results are stored (with duplicate detection) and
 * returned with their database IDs.
 */
export async function POST(request: Request) {
  const auth = await getRequestUser();
  if (!auth.allowed) return NextResponse.json({ error: "Log eerst in." }, { status: 401 });

  const limit = rateLimit(`search:${auth.user?.id ?? clientIp(request)}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Te veel zoekopdrachten. Wacht even." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const filters = parseSearchFilters(body);
  const provider = await getBusinessProvider();

  try {
    const result = await provider.search(filters);
    if (isSupabaseEnabled && result.provider !== "demo") {
      const stored = await persistBusinesses(result.businesses);
      return NextResponse.json({ ...result, ...stored });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    console.error("Search failed:", message);
    // Provider errors are safe to show (they never contain the API key).
    return NextResponse.json({ error: message.slice(0, 300) }, { status: provider.isConnected() ? 502 : 501 });
  }
}
