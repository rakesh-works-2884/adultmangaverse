import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Next.js 16 renamed the "middleware" convention to "proxy" (same API).
// Edge-safe auth instance (no Credentials provider, no Node deps).
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const isLoggedIn = Boolean(req.auth);
  const role = req.auth?.user?.role;

  const requireLogin = () => {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  };

  if (path.startsWith("/admin")) {
    if (!isLoggedIn) return requireLogin();
    if (role !== "ADMIN" && role !== "MOD") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  if (path.startsWith("/library")) {
    if (!isLoggedIn) return requireLogin();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/library/:path*"],
};
