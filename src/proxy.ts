import { NextResponse, type NextRequest } from "next/server";

const API_PREFIX = "/api";
const PUBLIC_PATHS = new Set(["/login"]);
const SESSION_COOKIES = ["access_token", "refresh_token"];

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith(`${API_PREFIX}/`)) {
    // Read at request time so one build runs in every environment.
    const apiUrl = process.env.API_URL ?? "http://localhost:4000";
    const target = new URL(
      `${pathname.slice(API_PREFIX.length)}${search}`,
      apiUrl,
    );
    return NextResponse.rewrite(target);
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // A convenience redirect only. The backend verifies the session on every
  // API call; a stale cookie gets past here and is caught there.
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
