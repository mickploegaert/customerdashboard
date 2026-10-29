import { industryValue } from "./constants";
import type { Business, LeadScore, LeadTier, ScoreFactor, ScoringSettings, WebsiteAudit } from "./types";

/**
 * Transparent lead scoring (0–100).
 *
 * Every point that is added is recorded as a "factor" so the UI can explain
 * exactly why a business received its score. The total is clamped to 0–100.
 *
 * Website problems are only counted when they were found by an audit.
 * A website that has not been analyzed yet gets no website points.
 *
 * The weights can be changed in Settings → Lead scoring.
 */
export const DEFAULT_SCORING: ScoringSettings = {
  noWebsite: 30,
  brokenWebsite: 25,
  outdatedWebsite: 20,
  poorMobile: 15,
  slowWebsite: 8,
  noSsl: 8,
  poorDesign: 8,
  lowConversion: 6,
  poorSeo: 5,
  websiteProblemCap: 35,
  highValueIndustry: 10,
  mediumValueIndustry: 5,
  socialButNoWebsite: 5,
  activeBusiness: 3,
  hotThreshold: 80,
  warmThreshold: 55,
};

/** Fixed tiers for reviews and rating (shown in Settings, not editable). */
export const REVIEW_TIERS = [
  { min: 500, points: 15 },
  { min: 200, points: 12 },
  { min: 100, points: 9 },
  { min: 50, points: 6 },
  { min: 20, points: 3 },
] as const;
export const FEW_REVIEWS_PENALTY = -5;
export const RATING_TIERS = [
  { min: 4.8, points: 10 },
  { min: 4.5, points: 7 },
  { min: 4.0, points: 4 },
] as const;
export const LOW_RATING_PENALTY = -5;

export function tierForScore(score: number, s: ScoringSettings = DEFAULT_SCORING): LeadTier {
  if (score >= s.hotThreshold) return "hot";
  if (score >= s.warmThreshold) return "warm";
  return "low";
}

export function calculateLeadScore(
  business: Business,
  audit: WebsiteAudit | null,
  s: ScoringSettings = DEFAULT_SCORING,
): LeadScore {
  const factors: ScoreFactor[] = [];

  // --- Website ---------------------------------------------------------------
  if (!business.website) {
    factors.push({ label: "Geen website", points: s.noWebsite });
  } else if (audit) {
    const has = (issue: string) => audit.issues.includes(issue as never);
    const issueFactors: ScoreFactor[] = [];
    if (has("broken")) issueFactors.push({ label: "Website lijkt kapot", points: s.brokenWebsite });
    if (has("outdated")) issueFactors.push({ label: "Hele oude website", points: s.outdatedWebsite });
    if (has("poor_mobile")) issueFactors.push({ label: "Slechte mobiele site", points: s.poorMobile });
    if (has("slow")) issueFactors.push({ label: "Trage website", points: s.slowWebsite });
    if (has("no_ssl")) issueFactors.push({ label: "Geen SSL (HTTPS)", points: s.noSsl });
    if (has("poor_design")) issueFactors.push({ label: "Zwak design", points: s.poorDesign });
    if (has("low_conversion")) issueFactors.push({ label: "Geen duidelijke actieknop", points: s.lowConversion });
    if (has("poor_seo")) issueFactors.push({ label: "Zwakke SEO-basis", points: s.poorSeo });

    // Cap the combined website-problem points so one bad site can't dominate.
    let remaining = s.websiteProblemCap;
    for (const f of issueFactors) {
      const points = Math.min(f.points, remaining);
      if (points <= 0) break;
      factors.push({ ...f, points });
      remaining -= points;
    }
  }

  // --- Reviews ---------------------------------------------------------------
  // OpenStreetMap has no review data. Missing is not the same as "0 reviews".
  const reviewsKnown = business.source !== "openstreetmap" && business.source !== "geoapify";
  if (reviewsKnown) {
    const reviewTier = REVIEW_TIERS.find((r) => business.reviewCount >= r.min);
    if (reviewTier) {
      factors.push({ label: `${reviewTier.min}+ reviews`, points: reviewTier.points });
    } else if (business.reviewCount < 10) {
      factors.push({ label: "Minder dan 10 reviews", points: FEW_REVIEWS_PENALTY });
    }
  }

  // --- Rating ----------------------------------------------------------------
  if (business.rating !== null) {
    const rating = business.rating;
    const ratingTier = RATING_TIERS.find((r) => rating >= r.min);
    if (ratingTier) {
      factors.push({ label: `Score ${rating.toFixed(1)}`, points: ratingTier.points });
    } else if (rating < 3.5) {
      factors.push({ label: `Lage score (${rating.toFixed(1)})`, points: LOW_RATING_PENALTY });
    }
  }

  // --- Industry value --------------------------------------------------------
  const value = industryValue(business.industry);
  if (value === "high") factors.push({ label: "Branche met hoge waarde", points: s.highValueIndustry });
  if (value === "medium") factors.push({ label: "Branche met middelhoge waarde", points: s.mediumValueIndustry });

  // --- Social media / activity ----------------------------------------------
  const hasSocial = Boolean(business.socials.instagram || business.socials.facebook || business.socials.linkedin);
  if (hasSocial && !business.website) {
    factors.push({ label: "Actief op social media, geen website", points: s.socialButNoWebsite });
  }
  if (business.openingHours.length > 0 && business.reviewCount >= 50) {
    factors.push({ label: "Gevestigd, actief bedrijf", points: s.activeBusiness });
  }

  const nonZero = factors.filter((f) => f.points !== 0);
  const raw = nonZero.reduce((sum, f) => sum + f.points, 0);
  const total = Math.max(0, Math.min(100, raw));
  return { total, tier: tierForScore(total, s), factors: nonZero };
}
