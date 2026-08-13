import { auth } from "@/auth";
import { NextResponse } from "next/server";

const APPROVAL_EXEMPT_PATHS = ["/pending-approval"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/stories") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/profile") ||
    isAdminRoute;

  if (isProtected && !req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    isProtected &&
    req.auth &&
    req.auth.user.approvalStatus !== "approved" &&
    !APPROVAL_EXEMPT_PATHS.some((p) => pathname.startsWith(p))
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Account pending approval." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/pending-approval", req.nextUrl.origin));
  }

  if (isAdminRoute && req.auth?.user?.role !== "super_admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/stories/:path*",
    "/projects/:path*",
    "/profile/:path*",
    "/pending-approval",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
