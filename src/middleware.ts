import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// ── Plan tier access map ────────────────────────────────────────────
// Maps route prefixes to the plan tiers that grant access

const PROFESSIONAL_PLUS = ["PROFESSIONAL", "ENTERPRISE"];
const STARTER_PLUS = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];

const planRoutes: Record<string, { tiers: string[]; feature: string }> = {
  "/prescriptions": { tiers: PROFESSIONAL_PLUS, feature: "Prescriptions" },
  "/orthodontics": { tiers: PROFESSIONAL_PLUS, feature: "Orthodontics" },
  "/pharmacy": { tiers: PROFESSIONAL_PLUS, feature: "Pharmacy" },
  "/staff": { tiers: PROFESSIONAL_PLUS, feature: "Staff Management" },
  "/whatsapp": { tiers: PROFESSIONAL_PLUS, feature: "WhatsApp Integration" },
  "/inventory": { tiers: STARTER_PLUS, feature: "Inventory" },
  "/analytics": { tiers: STARTER_PLUS, feature: "Analytics" },
  "/cashflow": { tiers: STARTER_PLUS, feature: "Cash Flow" },
};

// Routes accessible even with expired plans or during trial expiry
const ALWAYS_ALLOWED = ["/subscription", "/settings", "/onboarding", "/dashboard"];

// Public routes that don't require authentication
const PUBLIC_PATHS = ["/api/billing/webhook", "/api/whatsapp/webhook", "/api/whatsapp/twilio"];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // ── Public paths (no auth needed) ─────────────────────────────
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // ── Onboarding redirect ───────────────────────────────────────
    if (token?.onboardingComplete === false && !pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // ── Trial expiration check ────────────────────────────────────
    if (token?.planTier === "TRIAL" && token?.trialEndsAt) {
      const trialEnd = new Date(token.trialEndsAt as string);
      const now = new Date();

      if (now > trialEnd) {
        const isAllowed = ALWAYS_ALLOWED.some((p) => pathname.startsWith(p));
        if (!isAllowed) {
          return NextResponse.redirect(
            new URL("/subscription?expired=true", req.url)
          );
        }
      }
    }

    // ── Subscription status check (non-trial expired plans) ──────
    // If planTier is falsy or explicitly expired, restrict access
    if (!token?.planTier) {
      const isAllowed = ALWAYS_ALLOWED.some((p) => pathname.startsWith(p));
      if (!isAllowed) {
        return NextResponse.redirect(new URL("/subscription", req.url));
      }
    }

    // ── Plan-based feature gating ─────────────────────────────────
    for (const [route, { tiers, feature }] of Object.entries(planRoutes)) {
      if (pathname.startsWith(route)) {
        const userTier = token?.planTier as string;

        // TRIAL users get access to all features during active trial
        if (userTier === "TRIAL") break;

        if (!tiers.includes(userTier)) {
          const url = new URL("/subscription", req.url);
          url.searchParams.set("upgrade", "true");
          url.searchParams.set("feature", feature);
          return NextResponse.redirect(url);
        }
        break;
      }
    }

    // ── Role-based route protection ───────────────────────────────
    const roleRoutes: Record<string, string[]> = {
      "/superadmin": ["SUPERADMIN"],
      "/settings": ["SUPERADMIN", "ADMIN", "LAB_OWNER"],
      "/inventory": ["SUPERADMIN", "ADMIN", "LAB_OWNER"],
      "/staff": ["SUPERADMIN", "ADMIN", "LAB_OWNER"],
      "/pharmacy": ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION"],
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
      authorized: ({ token, req }) => {
        // Allow public paths without a token
        const pathname = req.nextUrl.pathname;
        if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cases/:path*",
    "/appointments/:path*",
    "/dentists/:path*",
    "/patients/:path*",
    "/billing/:path*",
    "/inventory/:path*",
    "/prescriptions/:path*",
    "/orthodontics/:path*",
    "/pharmacy/:path*",
    "/cashflow/:path*",
    "/analytics/:path*",
    "/staff/:path*",
    "/whatsapp/:path*",
    "/technician/:path*",
    "/settings/:path*",
    "/notifications/:path*",
    "/superadmin/:path*",
    "/subscription/:path*",
    "/onboarding/:path*",
    "/api/billing/webhook",
    "/api/whatsapp/webhook",
    "/api/whatsapp/twilio",
  ],
};
