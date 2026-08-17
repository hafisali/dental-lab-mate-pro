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

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;
    if (user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Bolt Optimization: Query lab records and subscriptions in parallel.
    // Derived metrics (newLabsThisMonth, newLabsLastMonth, churnedLabs) are calculated in-memory from allLabs
    // to eliminate 2 extra count queries and unnecessary joins.
    const [allLabs, subscriptions] = await Promise.all([
      prisma.lab.findMany({
        select: {
          plan: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.subscription.findMany({
        select: {
          id: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          lab: {
            select: {
              id: true,
              name: true,
              plan: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Bolt Optimization: Single O(N) loop to calculate MRR, revenue by plan, customer counts,
    // churn, and new lab registrations without redundant array iterations or extra DB queries.
    let totalMRR = 0;
    let totalPayingCustomers = 0;
    let trialLabsCount = 0;
    let churnedLabs = 0;
    let newLabsThisMonth = 0;
    let newLabsLastMonth = 0;

    const revenueByPlan: Record<string, { count: number; revenue: number }> = {
      trial: { count: 0, revenue: 0 },
      basic: { count: 0, revenue: 0 },
      pro: { count: 0, revenue: 0 },
      enterprise: { count: 0, revenue: 0 },
    };

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

      if (!lab.isActive) {
        churnedLabs++;
      }

      if (lab.createdAt >= startOfMonth) {
        newLabsThisMonth++;
      }

      if (lab.createdAt >= startOfLastMonth && lab.createdAt <= endOfLastMonth) {
        newLabsLastMonth++;
      }
    }

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
