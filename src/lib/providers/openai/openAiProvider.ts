import "server-only";

import type { LeadAiAnalysis } from "../../types";
import type { AiProvider, LeadFacts } from "../aiProvider";

const SYSTEM_PROMPT = `You are a sales assistant for a small web design studio.
You write short, honest lead analyses based ONLY on the JSON facts provided.

Strict rules:
- Never invent facts, numbers, names, services, history or problems that are not in the facts.
- If something is not in the facts, say "Unknown" (or leave it out of the pitch).
- If the website was not analyzed, do not claim it has problems; say its quality is unknown.
- Do not mention the internal lead score.
- Keep it concise and professional. No hype, no emojis.
- Write in the language given by "language" ("en" = English, "nl" = Dutch).

Return JSON with exactly these keys:
{
  "whyContact": string (2-4 sentences),
  "whatToSell": string[] (2-5 short items),
  "suggestedPitch": string (2-3 sentences, personal, based on the facts),
  "email": { "subject": string, "body": string } | null
}
"email" must be null unless includeEmail is true. The email is a short first-contact email (max 120 words), signed with senderName and senderCompany.`;

function cleanString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "Unknown";
}

export function createOpenAiProvider(apiKey: string, model: string): AiProvider {
  return {
    label: `OpenAI (${model})`,
    isConnected: () => true,

    async analyzeLead(facts: LeadFacts, { includeEmail }) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          model,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify({ includeEmail, facts }) },
          ],
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`AI request failed (${res.status}) ${detail.slice(0, 150)}`);
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content ?? "{}";

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error("AI returned an invalid response");
      }

      // Validate the shape – the UI renders these as plain text only.
      const email = parsed.email as Record<string, unknown> | null;
      return {
        whyContact: cleanString(parsed.whyContact, 1200),
        whatToSell: Array.isArray(parsed.whatToSell) ? parsed.whatToSell.map((x) => cleanString(x, 120)).slice(0, 6) : [],
        suggestedPitch: cleanString(parsed.suggestedPitch, 1000),
        email: includeEmail && email && typeof email === "object" ? { subject: cleanString(email.subject, 150), body: cleanString(email.body, 2000) } : null,
        generatedAt: new Date().toISOString(),
        model,
      };
    },
  };
}
