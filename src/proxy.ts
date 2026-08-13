import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/auth/is-super-admin";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/stories") || isAdminRoute;

  if (isProtected && !req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && !isSuperAdmin(req.auth?.user?.email)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/stories/:path*", "/admin/:path*", "/api/admin/:path*"],
};
