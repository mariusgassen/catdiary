import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Protects the (main) route group: redirects signed-out visitors to /sign-in.
// Renamed from `middleware` to `proxy` per Next.js 16's file convention.
export default auth((req) => {
  const isSignedIn = Boolean(req.auth?.user);
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith("/sign-in") || pathname.startsWith("/register");

  // Entry detail pages and invite landing pages are shareable links: leave
  // them open to signed-out visitors (the entry page 404s anything the viewer
  // isn't allowed to see; the invite page only shows public profile bits).
  const isShareablePage =
    /^\/cat-entries\/(?!new$)[^/]+$/.test(pathname) || /^\/invite\/[^/]+$/.test(pathname);

  if (!isSignedIn && !isAuthPage && !isShareablePage) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isSignedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/feed", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|manifest|favicon.ico|sw.js).*)"],
};
