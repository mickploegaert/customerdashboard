import { NextResponse } from "next/server";
import { dataMode, isDemoMode } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Which integrations are configured. Only booleans – never the keys themselves. */
export async function GET() {
  const geoapify = !isDemoMode && Boolean(process.env.GEOAPIFY_API_KEY);
  const googlePlaces = !isDemoMode && !geoapify && Boolean(process.env.GOOGLE_PLACES_API_KEY);
  return NextResponse.json({
    mode: dataMode,
    demo: isDemoMode,
    supabase: dataMode === "supabase",
    supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    googlePlaces,
    geoapify,
    openStreetMap: !isDemoMode && !geoapify && !googlePlaces,
    websiteAnalyzer: true,
    pageSpeed: Boolean(process.env.PAGESPEED_API_KEY),
    ai: true,
    aiProvider: process.env.OPENAI_API_KEY ? "openai" : "facts",
  });
}
