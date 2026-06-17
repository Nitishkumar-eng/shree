import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
    const isAdminApiRoute = req.nextUrl.pathname.startsWith("/api/admin");

    if (isAdminRoute || isAdminApiRoute) {
      if (token?.role !== "ADMIN") {
        // Redirect non-admin users to the homepage
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
  ],
};
