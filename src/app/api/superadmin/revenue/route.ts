import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const PLAN_PRICES: Record<string, number> = {
  trial: 0,
  basic: 999,
  pro: 2499,
  enterprise: 4999,
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all labs for calculations
    const [allLabs, subscriptions, newLabsThisMonth, newLabsLastMonth] = await Promise.all([
      prisma.lab.findMany({
        select: {
          id: true,
          name: true,
          plan: true,
          planTier: true,
          isActive: true,
          createdAt: true,
          planExpiresAt: true,
          subscription: {
            select: {
              id: true,
              status: true,
              currentPeriodStart: true,
              currentPeriodEnd: true,
              stripePriceId: true,
              cancelAtPeriodEnd: true,
            },
          },
        },
      }),
      prisma.subscription.findMany({
        include: {
          lab: {
            select: {
              id: true,
              name: true,
              plan: true,
              slug: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.lab.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.lab.count({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
    ]);

    // Calculate MRR
    let totalMRR = 0;
    const revenueByPlan: Record<string, { count: number; revenue: number }> = {
      trial: { count: 0, revenue: 0 },
      basic: { count: 0, revenue: 0 },
      pro: { count: 0, revenue: 0 },
      enterprise: { count: 0, revenue: 0 },
    };

    let totalPayingCustomers = 0;
    let trialLabsCount = 0;
    let convertedFromTrial = 0;

    for (const lab of allLabs) {
      const plan = lab.plan.toLowerCase();
      const price = PLAN_PRICES[plan] || 0;

      if (plan in revenueByPlan) {
        revenueByPlan[plan].count++;
      }

      if (lab.isActive && plan !== "trial") {
        totalMRR += price;
        totalPayingCustomers++;
        if (plan in revenueByPlan) {
          revenueByPlan[plan].revenue += price;
        }
      }

      if (plan === "trial") {
        trialLabsCount++;
      }
    }

    // Labs that were trial and are now paid (approximation)
    const paidLabs = allLabs.filter(
      (l) => l.isActive && l.plan.toLowerCase() !== "trial"
    );
    convertedFromTrial = paidLabs.length;

    // Churn: labs that became inactive in the last 30 days
    // (approximate - labs that are inactive and were updated recently)
    const inactiveLabs = allLabs.filter((l) => !l.isActive);
    const churnedLabs = inactiveLabs.length;

    // Conversion rate: paid / (paid + trial)
    const totalWithPotential = totalPayingCustomers + trialLabsCount;
    const conversionRate = totalWithPotential > 0
      ? Math.round((totalPayingCustomers / totalWithPotential) * 100)
      : 0;

    // Churn rate: churned / total * 100
    const churnRate = allLabs.length > 0
      ? Math.round((churnedLabs / allLabs.length) * 100)
      : 0;

    const totalARR = totalMRR * 12;
    const avgRevenuePerLab = totalPayingCustomers > 0
      ? Math.round(totalMRR / totalPayingCustomers)
      : 0;

    // Subscription details for table
    const subscriptionDetails = subscriptions.map((sub) => ({
      id: sub.id,
      labName: sub.lab.name,
      labSlug: sub.lab.slug,
      labId: sub.lab.id,
      plan: sub.lab.plan,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      amount: PLAN_PRICES[sub.lab.plan.toLowerCase()] || 0,
    }));

    return NextResponse.json({
      totalMRR,
      totalARR,
      avgRevenuePerLab,
      totalPayingCustomers,
      revenueByPlan,
      conversionRate,
      churnRate,
      churnedLabs,
      trialLabsCount,
      newLabsThisMonth,
      newLabsLastMonth,
      subscriptions: subscriptionDetails,
    });
  } catch (error) {
    console.error("Revenue metrics error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
