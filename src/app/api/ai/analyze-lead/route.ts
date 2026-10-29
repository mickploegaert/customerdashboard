import { NextResponse } from "next/server";
import { getAiProvider, type LeadFacts } from "@/lib/providers/aiProvider";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { getRequestUser } from "@/lib/supabase/server";

/** GET /api/ai/analyze-lead – tells the UI whether AI is configured. */
export async function GET() {
  const provider = await getAiProvider();
  return NextResponse.json({ connected: provider.isConnected(), label: provider.label });
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, max).map((x: string) => x.slice(0, 150)) : []);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Validates and limits every fact before it is sent to the AI model. */
function parseFacts(body: Record<string, unknown>): LeadFacts {
  const f = (body.facts ?? {}) as Record<string, unknown>;
  return {
    name: text(f.name, 200),
    industry: text(f.industry, 80),
    city: text(f.city, 100),
    country: text(f.country, 100),
    rating: num(f.rating),
    reviewCount: num(f.reviewCount) ?? 0,
    hasWebsite: f.hasWebsite === true,
    websiteAnalyzed: f.websiteAnalyzed === true,
    websiteScore: num(f.websiteScore),
    websiteProblems: list(f.websiteProblems, 10),
    verifiedChecksFailed: list(f.verifiedChecksFailed, 15),
    openingHoursKnown: f.openingHoursKnown === true,
    socialMedia: list(f.socialMedia, 3),
    description: text(f.description, 500) || null,
    leadScore: num(f.leadScore) ?? 0,
    scoreReasons: list(f.scoreReasons, 15),
    senderName: text(f.senderName, 100),
    senderCompany: text(f.senderCompany, 100),
    language: f.language === "nl" ? "nl" : "en",
  };
}

export async function POST(request: Request) {
  const auth = await getRequestUser();
  if (!auth.allowed) return NextResponse.json({ error: "Log eerst in." }, { status: 401 });

  const limit = rateLimit(`ai:${auth.user?.id ?? clientIp(request)}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Te veel teksten. Wacht even." }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const provider = await getAiProvider();
  if (!provider.isConnected()) {
    return NextResponse.json({ error: "AI API not connected. Add OPENAI_API_KEY to .env.local.", connected: false }, { status: 501 });
  }

  const facts = parseFacts(body);
  if (!facts.name) return NextResponse.json({ error: "Missing business facts." }, { status: 400 });

  try {
    const analysis = await provider.analyzeLead(facts, { includeEmail: body.includeEmail === true });
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("AI analysis failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "AI analysis failed. Please try again." }, { status: 502 });
  }
}
