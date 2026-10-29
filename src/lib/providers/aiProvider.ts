import type { LeadAiAnalysis } from "../types";

/**
 * AI lead analysis.
 *
 * The model only receives the facts in `LeadFacts`. The prompt forbids
 * inventing anything; missing information must be answered with "Unknown".
 */
export interface LeadFacts {
  name: string;
  industry: string;
  city: string;
  country: string;
  rating: number | null;
  reviewCount: number;
  hasWebsite: boolean;
  websiteAnalyzed: boolean;
  websiteScore: number | null;
  websiteProblems: string[];
  verifiedChecksFailed: string[];
  openingHoursKnown: boolean;
  socialMedia: string[];
  description: string | null;
  leadScore: number;
  scoreReasons: string[];
  /** Your company, used to sign the email. */
  senderName: string;
  senderCompany: string;
  language: "en" | "nl";
}

export interface AiProvider {
  readonly label: string;
  isConnected(): boolean;
  analyzeLead(facts: LeadFacts, options: { includeEmail: boolean }): Promise<LeadAiAnalysis>;
}

export async function getAiProvider(): Promise<AiProvider> {
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    const { createOpenAiProvider } = await import("./openai/openAiProvider");
    return createOpenAiProvider(key, process.env.OPENAI_MODEL || "gpt-4o-mini");
  }
  const { factsOnlyProvider } = await import("./facts/factsOnlyProvider");
  return factsOnlyProvider;
}
