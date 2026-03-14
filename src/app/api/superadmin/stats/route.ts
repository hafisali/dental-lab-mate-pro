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
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalLabs,
      activeLabs,
      trialLabs,
      paidLabs,
      expiringThisWeek,
      expiredLabs,
      totalUsers,
      activeUsers,
      recentLogins,
      recentRegistrations,
      newLabsThisMonth,
      allLabs,
      recentSignups,
    ] = await Promise.all([
      prisma.lab.count(),
      prisma.lab.count({ where: { isActive: true } }),
      prisma.lab.count({ where: { plan: "trial" } }),
      prisma.lab.count({ where: { plan: { not: "trial" } } }),
      prisma.lab.count({
        where: {
          planExpiresAt: { gte: now, lte: sevenDaysFromNow },
          plan: { not: "trial" },
        },
      }),
      prisma.lab.count({
        where: {
          planExpiresAt: { lt: now },
          plan: { not: "trial" },
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.loginActivity.count({
        where: { action: "LOGIN_SUCCESS", createdAt: { gte: twentyFourHoursAgo } },
      }),
      prisma.loginActivity.count({
        where: { action: "REGISTER", createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.lab.count({ where: { createdAt: { gte: startOfMonth } } }),
      // Fetch all labs to calculate MRR and plan breakdown
      prisma.lab.findMany({
        where: { isActive: true },
        select: { plan: true },
      }),
      // Recent signups (last 5 labs)
      prisma.lab.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          isActive: true,
          createdAt: true,
          _count: { select: { users: true } },
        },
      }),
    ]);

    // Calculate MRR from active labs
    let totalMRR = 0;
    const planBreakdown: Record<string, number> = { trial: 0, basic: 0, pro: 0, enterprise: 0 };

    for (const lab of allLabs) {
      const plan = lab.plan.toLowerCase();
      totalMRR += PLAN_PRICES[plan] || 0;
      if (plan in planBreakdown) {
        planBreakdown[plan]++;
      }
    }

    // Also count inactive labs in breakdown
    const inactiveLabs = await prisma.lab.findMany({
      where: { isActive: false },
      select: { plan: true },
    });
    for (const lab of inactiveLabs) {
      const plan = lab.plan.toLowerCase();
      if (plan in planBreakdown) {
        planBreakdown[plan]++;
      }
    }

    return NextResponse.json({
      totalLabs,
      activeLabs,
      trialLabs,
      paidLabs,
      totalMRR,
      expiringThisWeek,
      expiredLabs,
      totalUsers,
      activeUsers,
      recentLogins,
      recentRegistrations,
      newLabsThisMonth,
      planBreakdown,
      recentSignups,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
