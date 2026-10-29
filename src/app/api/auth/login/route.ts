import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { allowedEmails, createSessionToken, isAllowedEmail, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";

function sameSecret(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(request: Request) {
  const limit = rateLimit(`login:${clientIp(request)}`, 8, 15 * 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Te veel pogingen. Probeer het later opnieuw." }, { status: 429 });
  }

  if (!process.env.AUTH_PASSWORD || !process.env.AUTH_SECRET || allowedEmails().length === 0) {
    return NextResponse.json({ error: "Inloggen is niet ingesteld." }, { status: 503 });
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "E-mail en wachtwoord zijn verplicht." }, { status: 400 });
  }

  const emailOk = isAllowedEmail(email);
  const passwordOk = sameSecret(password, process.env.AUTH_PASSWORD);
  if (!emailOk || !passwordOk) {
    return NextResponse.json({ error: "Verkeerde e-mail of wachtwoord." }, { status: 401 });
  }

  const token = await createSessionToken(email);
  const response = NextResponse.json({ ok: true, email });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
