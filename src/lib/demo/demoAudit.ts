import { buildCategories, check, OPPORTUNITY_TEXT, overallScore, PROBLEM_TEXT } from "../audit";
import type { AuditCheck, CheckStatus, WebsiteAudit, WebsiteIssue } from "../types";

/**
 * Builds a FICTIONAL website audit for a demo business from a list of issues.
 * The output has the same shape as the live analyzer, so the UI can be tested
 * without any external website.
 */
export function buildDemoAudit(businessId: string, url: string, issues: WebsiteIssue[], phone: string | null): WebsiteAudit {
  const has = (i: WebsiteIssue) => issues.includes(i);
  const broken = has("broken");
  // When a site can't be loaded, almost nothing can be verified.
  const ifReachable = (status: CheckStatus): CheckStatus => (broken ? "unknown" : status);

  const design: AuditCheck[] = [
    check("Modern look", ifReachable(has("outdated") ? "fail" : "pass"), "estimated"),
    check("Visual quality", ifReachable(has("poor_design") ? "fail" : has("outdated") ? "warn" : "pass"), "estimated"),
    check("Typography", ifReachable(has("outdated") || has("poor_design") ? "warn" : "pass"), "estimated"),
    check("Layout", ifReachable(has("poor_design") ? "warn" : "pass"), "estimated"),
    check("Branding", ifReachable(has("poor_design") ? "fail" : "pass"), "estimated"),
  ];

  const mobile: AuditCheck[] = [
    check("Responsive layout (viewport)", ifReachable(has("poor_mobile") ? "fail" : "pass"), "verified"),
    check("Mobile usability", ifReachable(has("poor_mobile") ? "fail" : "pass"), "estimated"),
    check("Mobile navigation", ifReachable(has("poor_mobile") ? "warn" : "pass"), "estimated"),
  ];

  const technical: AuditCheck[] = [
    check("Site reachable", broken ? "fail" : "pass", "verified", broken ? "Server returned an error (demo)" : undefined),
    check("HTTPS", ifReachable(has("no_ssl") || url.startsWith("http://") ? "fail" : "pass"), "verified"),
    check(
      "Loading speed",
      ifReachable(has("slow") ? "fail" : "pass"),
      "verified",
      broken ? undefined : has("slow") ? "Largest content paint ≈ 6.8 s (demo value)" : "Largest content paint ≈ 1.9 s (demo value)",
    ),
    check("Broken links", ifReachable(has("outdated") ? "warn" : "pass"), "verified"),
    check("Basic performance", ifReachable(has("slow") ? "warn" : "pass"), "verified"),
  ];

  const seo: AuditCheck[] = [
    check("Title tag", ifReachable(has("poor_seo") ? "warn" : "pass"), "verified"),
    check("Meta description", ifReachable(has("poor_seo") ? "fail" : "pass"), "verified"),
    check("H1 heading", ifReachable(has("poor_seo") ? "warn" : "pass"), "verified"),
    check("Local SEO (city/address on page)", ifReachable(has("poor_seo") ? "fail" : "pass"), "estimated"),
    check("Structured data (schema.org)", ifReachable(has("poor_seo") || has("outdated") ? "fail" : "pass"), "verified"),
  ];

  const conversion: AuditCheck[] = [
    check("Clear call-to-action", ifReachable(has("low_conversion") ? "fail" : "pass"), "estimated"),
    check("Phone number visible", ifReachable(phone && !has("low_conversion") ? "pass" : "warn"), "verified"),
    check("Contact form", ifReachable(has("low_conversion") ? "fail" : "pass"), "verified"),
    check("Booking button", ifReachable(has("low_conversion") || has("outdated") ? "fail" : "pass"), "verified"),
    check("Quote button", ifReachable(has("low_conversion") ? "warn" : "pass"), "verified"),
  ];

  const categories = buildCategories({ design, mobile, technical, seo, conversion });
  const score = broken ? 10 : overallScore(categories);

  // A site served over plain http always has the "no_ssl" issue.
  const finalIssues = [...issues];
  if (url.startsWith("http://") && !finalIssues.includes("no_ssl")) finalIssues.push("no_ssl");

  return {
    businessId,
    url,
    analyzedAt: new Date().toISOString(),
    source: "demo",
    score,
    categories,
    issues: finalIssues,
    problems: finalIssues.map((i) => PROBLEM_TEXT[i]),
    opportunities: finalIssues.map((i) => OPPORTUNITY_TEXT[i]),
    screenshotUrl: null,
    enrichment: null,
    sources: ["Demo analyzer (fictional)"],
  };
}
