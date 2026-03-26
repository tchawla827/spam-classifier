import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // NOTE: The session cookie is set on the API domain (HF Space), not this
  // Vercel domain, so we cannot check it here. Route protection for /app is
  // handled client-side in apps/web/app/app/layout.tsx.
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app/:path*"],
};
