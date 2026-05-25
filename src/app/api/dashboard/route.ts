import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId, getTenantWhere } from "@/lib/tenant";

interface MonthRevenue {
  month: string;
  revenue: number;
}

interface RevenueStat {
  _sum: { amount: number | null };
}

interface BalanceStat {
  _sum: { balance: number | null };
}

interface StatusStat {
  status: string;
  _count: { status: number };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let labId: string;
    try {
      labId = requireLabId(session);
    } catch {
      return NextResponse.json({ error: "No clinic associated" }, { status: 403 });
    }

    if (!labId) {
      // SUPERADMIN without a specific lab selected
      return NextResponse.json({
        todayCases: 0,
        pendingCases: 0,
        deliveredCases: 0,
        totalIncome: 0,
        totalBalance: 0,
        recentCases: [],
        statusBreakdown: [],
        monthlyRevenue: [],
      });
    }

    const tenantWhere = getTenantWhere(labId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Prepare monthly revenue promises
    const revenuePromises: Promise<RevenueStat>[] = [];
    const revenueLabels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      // Set to 1st of month to avoid issues when today is 31st
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      revenueLabels.push(startOfMonth.toLocaleDateString("en-US", { month: "short", year: "2-digit" }));
      revenuePromises.push(
        prisma.payment.aggregate({
          where: {
            dentist: { ...tenantWhere },
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        }) as unknown as Promise<RevenueStat>
      );
    }

    const [
      todayCases,
      pendingCases,
      deliveredCases,
      recentCases,
      statusCounts,
      payments,
      dentistBalances,
      ...monthlyRevenueRaw
    ] = await Promise.all([
      prisma.case.count({
        where: { ...tenantWhere, date: { gte: today, lt: tomorrow } },
      }),
      prisma.case.count({
        where: { ...tenantWhere, status: { in: ["RECEIVED", "WORKING", "TRIAL"] } },
      }),
      prisma.case.count({
        where: { ...tenantWhere, status: "DELIVERED" },
      }),
      prisma.case.findMany({
        where: { ...tenantWhere },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          dentist: { select: { id: true, name: true, clinicName: true } },
          patient: { select: { id: true, name: true } },
        },
      }),
      prisma.case.groupBy({
        by: ["status"],
        where: { ...tenantWhere },
        _count: { status: true },
      }) as unknown as Promise<StatusStat[]>,
      prisma.payment.aggregate({
        where: { dentist: { ...tenantWhere } },
        _sum: { amount: true },
      }) as unknown as Promise<RevenueStat>,
      prisma.dentist.aggregate({
        where: { ...tenantWhere },
        _sum: { balance: true },
      }) as unknown as Promise<BalanceStat>,
      ...revenuePromises,
    ]);

    const totalIncome = payments._sum.amount || 0;
    const totalBalance = dentistBalances._sum.balance || 0;

    const statusBreakdown = statusCounts.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    const monthlyRevenue: MonthRevenue[] = monthlyRevenueRaw.map((res, i) => ({
      month: revenueLabels[i],
      revenue: res._sum.amount || 0,
    }));

    return NextResponse.json({
      todayCases,
      pendingCases,
      deliveredCases,
      totalIncome,
      totalBalance,
      recentCases,
      statusBreakdown,
      monthlyRevenue,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
