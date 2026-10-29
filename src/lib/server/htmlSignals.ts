import "server-only";

/**
 * Extracts simple, measurable signals from raw HTML using regular expressions.
 * The HTML is never rendered or returned to the browser – only these facts.
 */

export interface HtmlSignals {
  title: string | null;
  metaDescription: string | null;
  viewport: string | null;
  lang: string | null;
  h1Count: number;
  hasStructuredData: boolean;
  hasLocalBusinessSchema: boolean;
  hasForm: boolean;
  hasEmailOrTelInput: boolean;
  telLinks: string[];
  emails: string[];
  socials: { instagram?: string; facebook?: string; linkedin?: string };
  internalLinks: string[];
  ctaTexts: string[];
  hasBooking: boolean;
  hasQuote: boolean;
  copyrightYear: number | null;
  oldTechSignals: string[];
  modernSignals: string[];
  hasLogo: boolean;
  hasFavicon: boolean;
  hasNav: boolean;
  hasMobileMenu: boolean;
  tableLayout: boolean;
  scriptCount: number;
  visibleText: string;
  generator: string | null;
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function attrs(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) result[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return result;
}

function metaContent(html: string, key: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const a = attrs(tag);
    if ((a.name ?? a.property ?? "").toLowerCase() === key) return a.content ? decode(a.content) : "";
  }
  return null;
}

const CTA_RE = /\b(contact|call|bel|book|boek|get started|request|quote|offerte|afspraak|schedule|appointment|order|bestel|reserve|reserveer|get in touch|free estimate|termin|kontakt)\b/i;
const BOOKING_RE = /\b(book now|book online|booking|appointment|afspraak maken|online boeken|reserveer|reserve|schedule|termin buchen)\b|calendly\.com|fresha\.com|setmore\.com|acuityscheduling|squareup\.com\/appointments|booksy|treatwell|salonized|opentable|resengo/i;
const QUOTE_RE = /\b(quote|estimate|offerte|angebot|devis|kostenloses angebot|free estimate|prijsopgave)\b/i;
const IGNORED_EMAIL = /(example\.|sentry|wixpress|\.png|\.jpg|\.gif|\.webp|domain\.com|email\.com|yourdomain)/i;

export function extractSignals(html: string, pageUrl: string): HtmlSignals {
  const base = new URL(pageUrl);
  const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const visibleText = decode(noScripts.replace(/<[^>]+>/g, " ")).slice(0, 200_000);

  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({ a: attrs(m[1]), text: decode(m[2].replace(/<[^>]+>/g, " ")) }));
  const buttons = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].map((m) => decode(m[1].replace(/<[^>]+>/g, " ")));

  const hrefs = anchors.map((x) => x.a.href ?? "").filter(Boolean);
  const telLinks = hrefs.filter((h) => h.toLowerCase().startsWith("tel:")).map((h) => decodeURIComponent(h.slice(4)).trim());

  const emails = new Set<string>();
  for (const h of hrefs.filter((h) => h.toLowerCase().startsWith("mailto:"))) {
    const e = decodeURIComponent(h.slice(7).split("?")[0]).trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e) && !IGNORED_EMAIL.test(e)) emails.add(e);
  }
  for (const m of visibleText.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) {
    const e = m[0].toLowerCase();
    if (!IGNORED_EMAIL.test(e)) emails.add(e);
    if (emails.size >= 5) break;
  }

  const socials: HtmlSignals["socials"] = {};
  for (const h of hrefs) {
    if (!socials.instagram && /^https?:\/\/(www\.)?instagram\.com\/[a-z0-9_.]+/i.test(h)) socials.instagram = h;
    if (!socials.facebook && /^https?:\/\/(www\.|m\.)?facebook\.com\/(?!sharer)[^/?#]+/i.test(h)) socials.facebook = h;
    if (!socials.linkedin && /^https?:\/\/([a-z]+\.)?linkedin\.com\/(company|in)\/[^/?#]+/i.test(h)) socials.linkedin = h;
  }

  const internalLinks = new Set<string>();
  for (const h of hrefs) {
    if (/^(mailto:|tel:|javascript:|#)/i.test(h)) continue;
    try {
      const u = new URL(h, base);
      if (u.hostname === base.hostname && (u.protocol === "http:" || u.protocol === "https:")) {
        u.hash = "";
        if (u.toString() !== base.toString()) internalLinks.add(u.toString());
      }
    } catch {
      // ignore malformed links
    }
  }

  const ctaTexts = [...anchors.map((x) => x.text), ...buttons].filter((t) => t.length > 0 && t.length < 60 && CTA_RE.test(t)).slice(0, 10);
  const linkAndButtonText = [...anchors.map((x) => `${x.text} ${x.a.href ?? ""}`), ...buttons].join(" \n ");

  const years = [...visibleText.matchAll(/(?:©|copyright|\(c\))\s*(?:\d{4}\s*[-–]\s*)?((?:19|20)\d{2})/gi)].map((m) => Number(m[1]));
  const generator = metaContent(html, "generator");

  const oldTechSignals: string[] = [];
  if (/<font\b/i.test(html)) oldTechSignals.push("<font> tags");
  if (/<center\b/i.test(html)) oldTechSignals.push("<center> tags");
  if (/<marquee\b/i.test(html)) oldTechSignals.push("<marquee>");
  if (/<frameset\b|<frame\b/i.test(html)) oldTechSignals.push("Frames");
  if (/\.swf\b/i.test(html)) oldTechSignals.push("Flash");
  if (/jquery[-.]?1\.\d+/i.test(html)) oldTechSignals.push("jQuery 1.x");
  if (/<table\b[^>]*(width|bgcolor|cellpadding)=/i.test(html)) oldTechSignals.push("Table-based layout");
  if (generator && /(frontpage|dreamweaver|joomla! 1\.|joomla! 2\.|wordpress [1-4]\.)/i.test(generator)) oldTechSignals.push(`Old CMS (${generator})`);

  const modernSignals: string[] = [];
  if (/fonts\.googleapis\.com|use\.typekit\.net|fonts\.bunny\.net|@font-face/i.test(html)) modernSignals.push("Web fonts");
  if (/\bsrcset=/i.test(html)) modernSignals.push("Responsive images");
  if (/loading=["']lazy["']/i.test(html)) modernSignals.push("Lazy loading");
  if (/\/_next\/|__nuxt|data-reactroot|webflow|framer|squarespace|wix\.com|elementor|astro-/i.test(html)) modernSignals.push("Modern site builder/framework");
  if (metaContent(html, "og:image") !== null) modernSignals.push("Social share image");

  return {
    title: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)![1]) : null,
    metaDescription: metaContent(html, "description"),
    viewport: metaContent(html, "viewport"),
    lang: html.match(/<html\b[^>]*\blang=["']?([a-zA-Z-]+)/i)?.[1] ?? null,
    h1Count: (html.match(/<h1[\s>]/gi) ?? []).length,
    hasStructuredData: /<script[^>]+type=["']application\/ld\+json["']/i.test(html) || /itemtype=["']https?:\/\/schema\.org/i.test(html),
    hasLocalBusinessSchema: /"@type"\s*:\s*"?(LocalBusiness|Organization|Dentist|AutoRepair|Restaurant|HomeAndConstructionBusiness|HealthAndBeautyBusiness|ProfessionalService|Store)/i.test(html),
    hasForm: /<form\b/i.test(html),
    hasEmailOrTelInput: /<input[^>]+type=["']?(email|tel)/i.test(html) || /<textarea\b/i.test(html),
    telLinks,
    emails: [...emails].slice(0, 5),
    socials,
    internalLinks: [...internalLinks].slice(0, 40),
    ctaTexts,
    hasBooking: BOOKING_RE.test(linkAndButtonText),
    hasQuote: QUOTE_RE.test(linkAndButtonText),
    copyrightYear: years.length ? Math.max(...years) : null,
    oldTechSignals,
    modernSignals,
    hasLogo: /<img\b[^>]*(logo)[^>]*>/i.test(html) || /<svg\b[^>]*(logo)/i.test(html),
    hasFavicon: /<link\b[^>]*rel=["'][^"']*icon[^"']*["']/i.test(html),
    hasNav: /<nav\b/i.test(html) || /role=["']navigation["']/i.test(html),
    hasMobileMenu: /(hamburger|menu-toggle|navbar-toggler|mobile-menu|nav-toggle|menu-button|aria-controls=["'][^"']*menu)/i.test(html),
    tableLayout: oldTechSignals.includes("Table-based layout"),
    scriptCount: (html.match(/<script\b/gi) ?? []).length,
    visibleText,
    generator,
  };
}
