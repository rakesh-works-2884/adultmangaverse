import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

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

  if (path.startsWith("/library") || path.startsWith("/account")) {
    if (!isLoggedIn) return requireLogin();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/library/:path*", "/account/:path*"],
};
