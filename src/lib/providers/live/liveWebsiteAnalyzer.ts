import "server-only";

import { buildCategories, check, OPPORTUNITY_TEXT, overallScore, PROBLEM_TEXT } from "../../audit";
import { normalizePhone } from "../../leads";
import { extractSignals, type HtmlSignals } from "../../server/htmlSignals";
import { safeFetch, type SafeFetchResult } from "../../server/safeFetch";
import type { AuditCheck, CheckStatus, WebsiteAudit, WebsiteIssue } from "../../types";
import type { AnalyzeInput, WebsiteAnalyzer } from "../websiteAnalyzer";
import { runPageSpeed, type PageSpeedResult } from "./pageSpeed";

/**
 * Live website analyzer.
 * 1. Fetches the homepage server-side (safeFetch, SSRF-protected).
 * 2. Extracts measurable signals from the HTML.
 * 3. Optionally runs PageSpeed Insights for real speed data + a screenshot.
 *
 * Checks that can't be measured are returned as "unknown" – never guessed.
 */

async function checkBrokenLinks(links: string[]): Promise<{ checked: number; broken: number }> {
  const sample = links.slice(0, 8);
  const results = await Promise.all(
    sample.map(async (link) => {
      try {
        let r = await safeFetch(link, { method: "HEAD", timeoutMs: 6000 });
        if (r.status === 405 || r.status === 403) r = await safeFetch(link, { method: "GET", timeoutMs: 6000 });
        return r.status >= 400;
      } catch {
        return null; // couldn't check – don't count as broken
      }
    }),
  );
  const checked = results.filter((r) => r !== null);
  return { checked: checked.length, broken: checked.filter(Boolean).length };
}

function ratio(status: boolean | null, okWhenTrue = true): CheckStatus {
  if (status === null) return "unknown";
  return status === okWhenTrue ? "pass" : "fail";
}

function buildChecks(
  page: SafeFetchResult,
  s: HtmlSignals,
  input: AnalyzeInput,
  links: { checked: number; broken: number },
  psi: PageSpeedResult | null,
) {
  const year = new Date().getFullYear();

  // ---------------- Design (estimated) ----------------
  let modern: CheckStatus = "pass";
  let modernDetail = s.modernSignals.length ? `Modern signals: ${s.modernSignals.join(", ")}` : undefined;
  if (s.oldTechSignals.length >= 2 || (s.copyrightYear !== null && s.copyrightYear <= year - 5)) {
    modern = "fail";
    modernDetail = [s.oldTechSignals.length ? `Old techniques: ${s.oldTechSignals.join(", ")}` : null, s.copyrightYear ? `Copyright ${s.copyrightYear}` : null]
      .filter(Boolean)
      .join(" · ");
  } else if (s.oldTechSignals.length === 1 || (s.copyrightYear !== null && s.copyrightYear <= year - 3) || s.modernSignals.length === 0) {
    modern = "warn";
    modernDetail = [s.oldTechSignals[0], s.copyrightYear ? `Copyright ${s.copyrightYear}` : null, s.modernSignals.length === 0 ? "No modern web techniques detected" : null]
      .filter(Boolean)
      .join(" · ");
  }

  const design: AuditCheck[] = [
    check("Moderne uitstraling", modern, "estimated", modernDetail),
    check("Visuele kwaliteit", s.modernSignals.length >= 3 ? "pass" : s.modernSignals.length >= 1 ? "warn" : "fail", "estimated", "Gebaseerd op techniek in de code, geen visuele beoordeling"),
    check("Typografie", s.modernSignals.includes("Web fonts") ? "pass" : "warn", "estimated", s.modernSignals.includes("Web fonts") ? "Eigen webfonts" : "Alleen standaardlettertypen"),
    check("Layout", s.tableLayout || s.oldTechSignals.includes("Frames") ? "fail" : s.viewport ? "pass" : "warn", "estimated"),
    check("Logo en favicon", s.hasLogo && s.hasFavicon ? "pass" : s.hasLogo || s.hasFavicon ? "warn" : "fail", "estimated"),
  ];

  // ---------------- Mobile ----------------
  const viewportOk = s.viewport !== null && /width\s*=\s*device-width/i.test(s.viewport);
  const mobileUsability: AuditCheck = psi && (psi.viewportOk !== null || psi.fontSizeOk !== null)
    ? check(
        "Mobiel gebruik",
        psi.viewportOk === false || psi.fontSizeOk === false ? "fail" : "pass",
        "verified",
        `Lighthouse: viewport ${psi.viewportOk ? "ok" : "probleem"}, lettergrootte ${psi.fontSizeOk === null ? "onbekend" : psi.fontSizeOk ? "ok" : "te klein"}`,
      )
    : check("Mobiel gebruik", viewportOk ? "pass" : "fail", "estimated", "Alleen op basis van de viewport-tag");

  const mobile: AuditCheck[] = [
    check("Mobiele layout", viewportOk ? "pass" : "fail", "verified", s.viewport ? `viewport: ${s.viewport.slice(0, 80)}` : "Geen viewport-tag"),
    mobileUsability,
    check("Mobiel menu", s.hasMobileMenu ? "pass" : s.hasNav ? "warn" : "fail", "estimated", s.hasMobileMenu ? "Mobiel menu gevonden" : s.hasNav ? "Navigatie gevonden, geen mobiel menu" : "Geen navigatie gevonden"),
  ];

  // ---------------- Technical (verified) ----------------
  const https = page.finalUrl.startsWith("https://");
  let speed: AuditCheck;
  if (psi?.lcpMs != null) {
    const sec = psi.lcpMs / 1000;
    speed = check("Laadsnelheid", sec <= 2.5 ? "pass" : sec <= 4 ? "warn" : "fail", "verified", `Grootste content ${sec.toFixed(1)} s (mobiel, PageSpeed)`);
  } else {
    const sec = page.timeMs / 1000;
    speed = check("Laadsnelheid", sec <= 1.5 ? "pass" : sec <= 3.5 ? "warn" : "fail", "verified", `Server + HTML ${sec.toFixed(1)} s (volledige laadtijd niet gemeten)`);
  }

  const technical: AuditCheck[] = [
    check("Site bereikbaar", "pass", "verified", `HTTP ${page.status}`),
    check("HTTPS", https ? "pass" : "fail", "verified", page.upgradedToHttps ? "Stuurt http door naar https" : https ? undefined : "Site heeft geen HTTPS"),
    speed,
    links.checked === 0
      ? check("Kapotte links", "unknown", "verified", "Geen interne links gecontroleerd")
      : check("Kapotte links", links.broken === 0 ? "pass" : links.broken <= 1 ? "warn" : "fail", "verified", `${links.broken} van ${links.checked} gecontroleerde links kapot`),
    psi?.performanceScore != null
      ? check("Prestatie", psi.performanceScore >= 70 ? "pass" : psi.performanceScore >= 40 ? "warn" : "fail", "verified", `PageSpeed ${psi.performanceScore}/100 (mobiel)`)
      : check("Prestatie", page.bytes > 1_500_000 || s.scriptCount > 40 ? "warn" : "pass", "verified", `HTML ${(page.bytes / 1024).toFixed(0)} KB · ${s.scriptCount} scripts`),
  ];

  // ---------------- SEO ----------------
  const titleLen = s.title?.length ?? 0;
  const descLen = s.metaDescription?.length ?? 0;
  const cityMentioned = input.city ? s.visibleText.toLowerCase().includes(input.city.toLowerCase()) : null;
  const seo: AuditCheck[] = [
    check("Paginatitel", !s.title ? "fail" : titleLen >= 10 && titleLen <= 70 ? "pass" : "warn", "verified", s.title ? `"${s.title.slice(0, 80)}" (${titleLen} tekens)` : "Ontbreekt"),
    check("Meta-omschrijving", !s.metaDescription ? "fail" : descLen >= 50 && descLen <= 170 ? "pass" : "warn", "verified", s.metaDescription ? `${descLen} tekens` : "Ontbreekt"),
    check("H1-kop", s.h1Count === 1 ? "pass" : s.h1Count > 1 ? "warn" : "fail", "verified", `${s.h1Count} H1-kop${s.h1Count === 1 ? "" : "pen"}`),
    check(
      "Lokale SEO",
      cityMentioned === null ? "unknown" : cityMentioned && (s.hasLocalBusinessSchema || s.telLinks.length > 0) ? "pass" : cityMentioned ? "warn" : "fail",
      "estimated",
      cityMentioned === null ? "City unknown" : cityMentioned ? `“${input.city}” mentioned on the homepage` : `“${input.city}” not mentioned on the homepage`,
    ),
    check("Gestructureerde data", s.hasLocalBusinessSchema ? "pass" : s.hasStructuredData ? "warn" : "fail", "verified", s.hasLocalBusinessSchema ? "Bedrijfsschema gevonden" : s.hasStructuredData ? "Data gevonden, geen bedrijfstype" : "Niets gevonden"),
  ];

  // ---------------- Conversion ----------------
  const phoneDigits = normalizePhone(input.phone ?? null);
  const pageDigits = s.visibleText.replace(/\D/g, "");
  const phoneVisible = s.telLinks.length > 0 || Boolean(phoneDigits && pageDigits.includes(phoneDigits.slice(-8)));
  const conversion: AuditCheck[] = [
    check("Duidelijke knop", s.ctaTexts.length >= 2 ? "pass" : s.ctaTexts.length === 1 ? "warn" : "fail", "estimated", s.ctaTexts.length ? `Gevonden: ${s.ctaTexts.slice(0, 3).join(", ")}` : "Geen actieknop gevonden"),
    check("Telefoon zichtbaar", phoneVisible ? (s.telLinks.length ? "pass" : "warn") : "fail", "verified", s.telLinks.length ? "Klikbaar telefoonnummer" : phoneVisible ? "Nummer staat er, niet klikbaar" : "Geen telefoonnummer gevonden"),
    check("Contactformulier", s.hasForm && s.hasEmailOrTelInput ? "pass" : s.hasForm ? "warn" : "fail", "verified", "Alleen de homepage"),
    check("Boekknop", s.hasBooking ? "pass" : "fail", "verified", "Alleen de homepage"),
    check("Offerteknop", s.hasQuote ? "pass" : "warn", "verified", "Alleen de homepage"),
  ];

  return { design, mobile, technical, seo, conversion };
}

function unreachableAudit(input: AnalyzeInput, detail: string): WebsiteAudit {
  const u = (label: string, basis: "verified" | "estimated" = "verified") => check(label, "unknown", basis);
  const categories = buildCategories({
    design: [u("Modern look", "estimated"), u("Visual quality", "estimated")],
    mobile: [u("Responsive layout (viewport)")],
    technical: [check("Site bereikbaar", "fail", "verified", detail)],
    seo: [u("Title tag"), u("Meta description")],
    conversion: [u("Contact form")],
  });
  return {
    businessId: input.businessId,
    url: input.url,
    analyzedAt: new Date().toISOString(),
    source: "live",
    score: 5,
    categories,
    issues: ["broken"],
    problems: [PROBLEM_TEXT.broken],
    opportunities: [OPPORTUNITY_TEXT.broken],
    screenshotUrl: null,
    enrichment: null,
    sources: ["HTML scan"],
  };
}

export const liveWebsiteAnalyzer: WebsiteAnalyzer = {
  label: "Live analyzer",
  isConnected: () => true,

  async analyze(input) {
    let page: SafeFetchResult;
    try {
      page = await safeFetch(input.url);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      if (message === "Blocked host") throw e;
      return unreachableAudit(input, `Could not connect: ${message.slice(0, 120)}`);
    }
    if (!page.ok) return unreachableAudit(input, `Server returned HTTP ${page.status}`);
    if (!/html/i.test(page.contentType) && !/<html/i.test(page.body.slice(0, 2000))) {
      return unreachableAudit(input, `Not an HTML page (${page.contentType || "unknown type"})`);
    }

    const signals = extractSignals(page.body, page.finalUrl);
    const psiKey = process.env.PAGESPEED_API_KEY;
    const [links, psi] = await Promise.all([checkBrokenLinks(signals.internalLinks), psiKey ? runPageSpeed(page.finalUrl, psiKey) : Promise.resolve(null)]);

    const categories = buildCategories(buildChecks(page, signals, input, links, psi));
    const cat = (key: string) => categories.find((c) => c.key === key)!;
    const find = (key: string, label: string) => cat(key).checks.find((c) => c.label === label);

    const issues: WebsiteIssue[] = [];
    if (find("design", "Moderne uitstraling")?.status === "fail") issues.push("outdated");
    if (find("mobile", "Mobiele layout")?.status === "fail" || find("mobile", "Mobiel gebruik")?.status === "fail") issues.push("poor_mobile");
    if (find("technical", "Laadsnelheid")?.status === "fail") issues.push("slow");
    if (find("technical", "HTTPS")?.status === "fail") issues.push("no_ssl");
    if (cat("design").score < 50) issues.push("poor_design");
    if (cat("seo").score < 50) issues.push("poor_seo");
    if (cat("conversion").score < 50) issues.push("low_conversion");

    const sources = ["HTML-scan (homepage)"];
    if (psi) sources.push("Google PageSpeed Insights");

    return {
      businessId: input.businessId,
      url: page.finalUrl,
      analyzedAt: new Date().toISOString(),
      source: "live",
      score: overallScore(categories),
      categories,
      issues,
      problems: issues.map((i) => PROBLEM_TEXT[i]),
      opportunities: issues.map((i) => OPPORTUNITY_TEXT[i]),
      screenshotUrl: psi?.screenshot ?? null,
      enrichment: { emails: signals.emails, phones: signals.telLinks.slice(0, 3), socials: signals.socials },
      sources,
    };
  },
};
