import { NextResponse, type NextRequest } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

// Must be referenced here so Next.js inlines them into the Edge middleware bundle.
const AUTH_SECRET = process.env.AUTH_SECRET;
const AUTH_ALLOWED_EMAILS = process.env.AUTH_ALLOWED_EMAILS;

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value, {
    secret: AUTH_SECRET,
    allowedEmailsCsv: AUTH_ALLOWED_EMAILS,
  });

  if (!session && !isPublic) {
    if (path.startsWith("/api")) {
      return NextResponse.json({ error: "Log eerst in." }, { status: 401 });
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  if (session && path === "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
