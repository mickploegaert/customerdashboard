import type { AuditCategory, AuditCheck, CheckBasis, CheckStatus, WebsiteIssue } from "./types";

/** Shared helpers for the demo and live website analyzers. */

export const PROBLEM_TEXT: Record<WebsiteIssue, string> = {
  outdated: "Verouderd design",
  poor_mobile: "Site is niet mobielvriendelijk",
  slow: "Trage laadtijd",
  poor_design: "Zwak design en huisstijl",
  no_ssl: "Geen HTTPS / SSL",
  broken: "Website kon niet geladen worden",
  poor_seo: "SEO-basis ontbreekt (titel, meta-omschrijving, H1, lokale SEO)",
  low_conversion: "Geen duidelijke knop, contactformulier of online boeken",
};

export const OPPORTUNITY_TEXT: Record<WebsiteIssue, string> = {
  outdated: "Moderne redesign",
  poor_mobile: "Nieuw responsive design",
  slow: "Site sneller maken",
  poor_design: "Professionele huisstijl en layout",
  no_ssl: "HTTPS en beveiliging",
  broken: "Een werkende site bouwen",
  poor_seo: "Betere lokale SEO",
  low_conversion: "Duidelijke knop en boekingssysteem",
};

export function check(label: string, status: CheckStatus, basis: CheckBasis, detail?: string): AuditCheck {
  return { label, status, basis, detail };
}

/** pass = 100, warn = 50, fail = 0. Unknown checks are ignored (never guessed). */
export function categoryScore(checks: AuditCheck[]): number {
  const known = checks.filter((c) => c.status !== "unknown");
  if (known.length === 0) return 0;
  const points = known.reduce((sum, c) => sum + (c.status === "pass" ? 100 : c.status === "warn" ? 50 : 0), 0);
  return Math.round(points / known.length);
}

export function buildCategories(groups: Record<AuditCategory["key"], AuditCheck[]>): AuditCategory[] {
  const labels: Record<AuditCategory["key"], string> = {
    design: "Design",
    mobile: "Mobiel",
    technical: "Technisch",
    seo: "SEO",
    conversion: "Conversie",
  };
  return (Object.keys(labels) as AuditCategory["key"][]).map((key) => ({
    key,
    label: labels[key],
    checks: groups[key],
    score: categoryScore(groups[key]),
  }));
}

/** Overall score = average of categories that have at least one known check. */
export function overallScore(categories: AuditCategory[]): number {
  const scored = categories.filter((c) => c.checks.some((k) => k.status !== "unknown"));
  if (scored.length === 0) return 0;
  return Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length);
}
