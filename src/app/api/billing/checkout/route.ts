import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireLabId } from "@/lib/tenant";
import { createStripeCustomer, createCheckoutSession } from "@/lib/stripe";
import prisma from "@/lib/prisma";

interface SessionUser {
  id?: string;
  email?: string;
  role?: string;
  labId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const labId = requireLabId(session);

    // Performance optimization: Parallelize request body parsing with lab database query
    // and select only required fields (name, stripeCustomerId) to minimize payload size.
    const [{ priceId }, lab] = await Promise.all([
      req.json().catch(() => ({})),
      prisma.lab.findUnique({
        where: { id: labId },
        select: { name: true, stripeCustomerId: true },
      }),
    ]);

    if (!priceId) {
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
    }

    if (!lab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 });
    }

    const user = session.user as SessionUser;

    // Create Stripe customer if none exists
    let customerId = lab.stripeCustomerId;
    if (!customerId) {
      const customer = await createStripeCustomer(
        user.email || "",
        lab.name,
        labId
      );
      customerId = customer.id;
      await prisma.lab.update({
        where: { id: labId },
        data: { stripeCustomerId: customerId },
      });
    }

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";

    const checkoutSession = await createCheckoutSession({
      customerId,
      priceId,
      labId,
      successUrl: `${origin}/subscription?success=true`,
      cancelUrl: `${origin}/subscription?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("[BILLING_CHECKOUT]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
