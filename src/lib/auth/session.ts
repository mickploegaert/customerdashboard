/**
 * Signed admin session cookie. Edge-safe (Web Crypto) so middleware can verify it.
 * The password itself never lives in this cookie – only the allowed email + expiry.
 */

export const SESSION_COOKIE = "mk_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Values that middleware must pass in – Edge only inlines `process.env.*` from middleware.ts itself. */
export interface SessionEnv {
  secret?: string;
  allowedEmailsCsv?: string;
}

function getSecret(override?: string): string {
  const secret = override ?? process.env.AUTH_SECRET ?? "";
  if (secret.length < 16) throw new Error("AUTH_SECRET is missing. Add it to .env.local.");
  return secret;
}

export function allowedEmails(csv?: string): string[] {
  return (csv ?? process.env.AUTH_ALLOWED_EMAILS ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string, csv?: string): boolean {
  return allowedEmails(csv).includes(email.trim().toLowerCase());
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function signBytes(secret: string, data: Uint8Array): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), data as BufferSource);
  return toBase64Url(new Uint8Array(sig));
}

export async function createSessionToken(email: string): Promise<string> {
  const payload = JSON.stringify({ email: email.trim().toLowerCase(), exp: Date.now() + MAX_AGE_SECONDS * 1000 });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));
  const sig = await signBytes(getSecret(), new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${sig}`;
}

export async function readSessionToken(token: string | undefined, env?: SessionEnv): Promise<{ email: string } | null> {
  if (!token || !token.includes(".")) return null;
  try {
    const [payloadB64, sig] = token.split(".");
    const expected = await signBytes(getSecret(env?.secret), new TextEncoder().encode(payloadB64));
    if (expected.length !== sig.length) return null;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    if (diff !== 0) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64))) as { email?: string; exp?: number };
    if (!payload.email || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (!isAllowedEmail(payload.email, env?.allowedEmailsCsv)) return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}
