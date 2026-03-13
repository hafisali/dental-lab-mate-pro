import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Role-based route protection
    const roleRoutes: Record<string, string[]> = {
      "/settings": ["ADMIN", "LAB_OWNER"],
      "/inventory": ["ADMIN", "LAB_OWNER"],
    };

    for (const [route, roles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route) && !roles.includes(token?.role as string)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cases/:path*",
    "/dentists/:path*",
    "/patients/:path*",
    "/billing/:path*",
    "/inventory/:path*",
    "/technician/:path*",
    "/settings/:path*",
    "/notifications/:path*",
  ],
};
