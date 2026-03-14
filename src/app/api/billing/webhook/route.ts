import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import type { PlanTier } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Map Stripe price IDs to plan tiers
function getPlanTierFromPriceId(priceId: string): PlanTier {
  const priceToTier: Record<string, PlanTier> = {
    [process.env.STRIPE_STARTER_MONTHLY || ""]: "STARTER",
    [process.env.STRIPE_STARTER_YEARLY || ""]: "STARTER",
    [process.env.STRIPE_PRO_MONTHLY || ""]: "PROFESSIONAL",
    [process.env.STRIPE_PRO_YEARLY || ""]: "PROFESSIONAL",
    [process.env.STRIPE_ENTERPRISE_MONTHLY || ""]: "ENTERPRISE",
    [process.env.STRIPE_ENTERPRISE_YEARLY || ""]: "ENTERPRISE",
  };

  return priceToTier[priceId] || "TRIAL";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const event = constructWebhookEvent(body, signature);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const labId = session.metadata?.labId;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (!labId || !subscriptionId) break;

        // Retrieve subscription details from Stripe
        const { stripe } = await import("@/lib/stripe");
        const subscriptionData = await stripe.subscriptions.retrieve(subscriptionId) as any;
        const priceId = subscriptionData.items.data[0]?.price?.id || "";
        const planTier = getPlanTierFromPriceId(priceId);

        // Create subscription record
        await prisma.subscription.create({
          data: {
            labId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            stripeCustomerId: customerId,
            status: "active",
            currentPeriodStart: new Date(subscriptionData.current_period_start * 1000),
            currentPeriodEnd: new Date(subscriptionData.current_period_end * 1000),
            cancelAtPeriodEnd: false,
          },
        });

        // Update lab with plan info
        await prisma.lab.update({
          where: { id: labId },
          data: {
            planTier,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: customerId,
          },
        });

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const { stripe } = await import("@/lib/stripe");
        const subData = await stripe.subscriptions.retrieve(subscriptionId) as any;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            status: "active",
            currentPeriodStart: new Date(subData.current_period_start * 1000),
            currentPeriodEnd: new Date(subData.current_period_end * 1000),
          },
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: "past_due" },
        });

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const subscriptionId = subscription.id as string;
        const priceId = subscription.items.data[0]?.price?.id || "";
        const planTier = getPlanTierFromPriceId(priceId);

        // Sync subscription record
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            stripePriceId: priceId,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          },
        });

        // Update lab plan tier
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (sub) {
          await prisma.lab.update({
            where: { id: sub.labId },
            data: { planTier },
          });
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const subscriptionId = subscription.id as string;

        // Find the subscription to get the labId
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (sub) {
          // Reset lab to trial
          await prisma.lab.update({
            where: { id: sub.labId },
            data: {
              planTier: "TRIAL",
              stripeSubscriptionId: null,
            },
          });

          // Delete subscription record
          await prisma.subscription.deleteMany({
            where: { stripeSubscriptionId: subscriptionId },
          });
        }

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[STRIPE_WEBHOOK]", error);
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 400 }
    );
  }
}
