import type { LeadAiAnalysis } from "../../types";
import type { AiProvider, LeadFacts } from "../aiProvider";

/**
 * Honest lead write-up from facts we already have. No language model, no invented numbers.
 * Missing information is written as Unknown.
 */
function join(parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

function sellItems(facts: LeadFacts): string[] {
  const nl = facts.language === "nl";
  const items: string[] = [];
  if (!facts.hasWebsite) {
    items.push(nl ? "Een eigen website" : "A dedicated website");
    items.push(nl ? "Lokale SEO, zodat ze ook buiten de kaart gevonden worden" : "Local SEO so they show up beyond the map listing");
    items.push(nl ? "Duidelijk contact, offerte of boeken" : "Clear contact / quote / booking");
  } else if (!facts.websiteAnalyzed) {
    items.push(nl ? "Website nakijken (kwaliteit is nog onbekend)" : "Website review (quality is still unknown)");
  } else {
    const text = facts.websiteProblems.join(" ").toLowerCase();
    if (text.includes("mobile") || text.includes("mobiel")) items.push(nl ? "Mobielvriendelijk redesign" : "Mobile-friendly redesign");
    if (text.includes("outdated") || text.includes("design") || text.includes("verouderd")) items.push(nl ? "Moderne redesign" : "Modern redesign");
    if (text.includes("ssl") || text.includes("https")) items.push(nl ? "HTTPS / beveiliging" : "HTTPS / security setup");
    if (text.includes("slow") || text.includes("performance") || text.includes("traag") || text.includes("snelheid")) items.push(nl ? "Site sneller maken" : "Performance work");
    if (text.includes("seo") || text.includes("meta")) items.push(nl ? "Lokale SEO" : "Local SEO");
    if (text.includes("cta") || text.includes("booking") || text.includes("contact") || text.includes("knop") || text.includes("boeken")) items.push(nl ? "Duidelijkere knoppen / boeken" : "Clearer calls-to-action / booking");
    if (items.length === 0) items.push(nl ? "Kleine verbeteringen (SEO, boeken, tekst). De site oogt al redelijk." : "Smaller upgrades (SEO, booking, content) – the site already looks in reasonable shape");
  }
  return items.slice(0, 5);
}

function whyContact(facts: LeadFacts, nl: boolean): string {
  const loc = [facts.city, facts.country].filter(Boolean).join(", ") || (nl ? "onbekende plaats" : "Unknown");
  const sentences: string[] = [];

  if (nl) {
    sentences.push(`${facts.name} (${facts.industry}) in ${loc}.`);
    if (!facts.hasWebsite) sentences.push("In de kaartgegevens staat geen website.");
    else if (!facts.websiteAnalyzed) sentences.push("Er is een website vermeld; die is nog niet geanalyseerd, dus de kwaliteit is Unknown.");
    else if (facts.websiteProblems.length > 0) {
      sentences.push(`Website-score ${facts.websiteScore ?? "Unknown"}/100. Gevonden problemen: ${facts.websiteProblems.join("; ")}.`);
    } else {
      sentences.push(`Website-score ${facts.websiteScore ?? "Unknown"}/100. Geen grote problemen gemeten.`);
    }
    sentences.push(
      facts.rating !== null
        ? `Beoordeling ${facts.rating.toFixed(1)} uit ${facts.reviewCount} reviews.`
        : "Google-beoordeling en aantal reviews: Unknown (deze bron levert die data niet).",
    );
    if (facts.verifiedChecksFailed.length > 0) {
      sentences.push(`Geverifieerd niet in orde: ${facts.verifiedChecksFailed.join(", ")}.`);
    }
  } else {
    sentences.push(`${facts.name} (${facts.industry}) in ${loc}.`);
    if (!facts.hasWebsite) sentences.push("No website is listed in the map data.");
    else if (!facts.websiteAnalyzed) sentences.push("A website is listed. It has not been analyzed yet, so its quality is Unknown.");
    else if (facts.websiteProblems.length > 0) {
      sentences.push(`Website score ${facts.websiteScore ?? "Unknown"}/100. Problems found: ${facts.websiteProblems.join("; ")}.`);
    } else {
      sentences.push(`Website score ${facts.websiteScore ?? "Unknown"}/100. No major problems were measured.`);
    }
    sentences.push(
      facts.rating !== null
        ? `Rating ${facts.rating.toFixed(1)} from ${facts.reviewCount} reviews.`
        : "Google rating and review count: Unknown (this data source does not include reviews).",
    );
    if (facts.verifiedChecksFailed.length > 0) {
      sentences.push(`Verified issues: ${facts.verifiedChecksFailed.join(", ")}.`);
    }
  }
  return join(sentences);
}

function pitch(facts: LeadFacts, nl: boolean): string {
  const loc = facts.city || "Unknown";
  if (nl) {
    if (!facts.hasWebsite) {
      return `Hallo, ik maak websites voor ${facts.industry.toLowerCase()}-bedrijven. ${facts.name} in ${loc} heeft volgens de openbare gegevens geen eigen site. Ik kan een overzichtelijke site maken waarop klanten jullie direct kunnen bereiken.`;
    }
    if (!facts.websiteAnalyzed) {
      return `Hallo, ${facts.name} in ${loc} heeft een website in de kaartgegevens. Die is nog niet geanalyseerd, dus de kwaliteit is Unknown.`;
    }
    if (facts.websiteProblems.length > 0) {
      return `Hallo, ik keek naar de site van ${facts.name}. Wat we wél hebben kunnen checken: ${facts.websiteProblems.join(", ").toLowerCase()}. Als jullie daar iets aan willen doen, kan ik een voorstel maken.`;
    }
    return `Hallo, ik werk met ${facts.industry.toLowerCase()}-bedrijven in ${loc}. Over de huidige website is weinig mis gemeten; of een upgrade zinvol is, hangt af van jullie doelen. Dat is Unknown tot we dat bespreken.`;
  }
  if (!facts.hasWebsite) {
    return `Hi — I build websites for ${facts.industry.toLowerCase()} businesses. ${facts.name} in ${loc} does not have a website listed in public map data. I can put a clear site in place so customers can contact you directly.`;
  }
  if (!facts.websiteAnalyzed) {
    return `Hi — ${facts.name} in ${loc} has a website listed. It has not been analyzed yet, so its quality is Unknown.`;
  }
  if (facts.websiteProblems.length > 0) {
    return `Hi — I looked at the public website for ${facts.name}. What we could verify: ${facts.websiteProblems.join(", ").toLowerCase()}. If you want that fixed, I can send a short proposal.`;
  }
  return `Hi — I work with ${facts.industry.toLowerCase()} businesses in ${loc}. We did not measure major website problems. Whether an upgrade is worth it is Unknown until we talk about your goals.`;
}

function email(facts: LeadFacts, nl: boolean): { subject: string; body: string } {
  const sign = [facts.senderName, facts.senderCompany].filter(Boolean).join("\n") || "MK Studios";
  if (nl) {
    return {
      subject: facts.hasWebsite ? `Korte check van de website van ${facts.name}` : `Website voor ${facts.name}?`,
      body: `${pitch(facts, true)}\n\nGeen verplichting — als het niet relevant is, hoor ik het graag.\n\n${sign}`,
    };
  }
  return {
    subject: facts.hasWebsite ? `Quick look at the ${facts.name} website` : `A website for ${facts.name}?`,
    body: `${pitch(facts, false)}\n\nNo obligation — if this is not relevant, feel free to say so.\n\n${sign}`,
  };
}

export const factsOnlyProvider: AiProvider = {
  label: "Facts-only (no AI key)",
  isConnected: () => true,
  async analyzeLead(facts, { includeEmail }) {
    const nl = facts.language === "nl";
    return {
      whyContact: whyContact(facts, nl),
      whatToSell: sellItems(facts),
      suggestedPitch: pitch(facts, nl),
      email: includeEmail ? email(facts, nl) : null,
      generatedAt: new Date().toISOString(),
      model: "facts-only",
    };
  },
};
