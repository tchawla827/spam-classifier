import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("spamshield_session");
  const isRoot = request.nextUrl.pathname === "/";

  // Authenticated user on landing page -> redirect to app
  if (isRoot && session) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  // Unauthenticated user on app routes -> redirect to landing
  if (!isRoot && !session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app/:path*"],
};
