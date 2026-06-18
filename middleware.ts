import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    const isAdminRoute = path.startsWith("/admin");
    const isAdminApiRoute = path.startsWith("/api/admin");
    const isShipperRoute = path.startsWith("/shipper");
    const isShipperApiRoute = path.startsWith("/api/shipper");

    if (isAdminRoute || isAdminApiRoute) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    if (isShipperRoute || isShipperApiRoute) {
      if (token?.role !== "SHIPPER" && token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/checkout/:path*",
    "/orders/:path*",
    "/wishlist/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/shipper/:path*",
    "/api/shipper/:path*",
  ],
};
