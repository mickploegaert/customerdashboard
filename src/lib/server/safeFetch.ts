import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Fetches a public web page safely (SSRF protection):
 * - only http(s)
 * - hostname must resolve to a PUBLIC IP address (no localhost / private networks)
 * - redirects are followed manually (max 4) and every hop is checked again
 * - response size and time are limited
 */

const MAX_BYTES = 2_500_000;
const MAX_REDIRECTS = 4;
const USER_AGENT = "Mozilla/5.0 (compatible; MKStudiosAnalyzer/1.0; +website audit)";

function isPrivateIpv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) return isPrivateIpv4(ip);
  const v6 = ip.toLowerCase();
  if (v6 === "::1" || v6 === "::") return true;
  if (v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80")) return true;
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http(s) URLs are allowed");
  if (url.username || url.password) throw new Error("URLs with credentials are not allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Blocked host");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) throw new Error("Blocked host");
  return url;
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  finalUrl: string;
  /** true when an http:// URL ended up on https:// */
  upgradedToHttps: boolean;
  body: string;
  bytes: number;
  timeMs: number;
  contentType: string;
}

export async function safeFetch(rawUrl: string, options: { method?: "GET" | "HEAD"; timeoutMs?: number } = {}): Promise<SafeFetchResult> {
  const started = Date.now();
  const startUrl = new URL(rawUrl);
  let current = await assertPublicUrl(rawUrl);
  let response: Response | null = null;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    response = await fetch(current, {
      method: options.method ?? "GET",
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
      cache: "no-store",
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      current = await assertPublicUrl(new URL(location, current).toString());
      continue;
    }
    break;
  }
  if (!response) throw new Error("No response");

  // Read the body with a size limit.
  let body = "";
  let bytes = 0;
  if (options.method !== "HEAD" && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      body += decoder.decode(value, { stream: true });
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    finalUrl: current.toString(),
    upgradedToHttps: startUrl.protocol === "http:" && current.protocol === "https:",
    body,
    bytes,
    timeMs: Date.now() - started,
    contentType: response.headers.get("content-type") ?? "",
  };
}
