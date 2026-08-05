import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId, getTenantWhere } from "@/lib/tenant";

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

    // Fetch initial metrics in parallel.
    // Optimisation: We eliminate 2 redundant database .count() queries for pending and delivered cases.
    // Instead, we derive pendingCases and deliveredCases directly in-memory from the statusCounts groupBy query.
    const [
      todayCases,
      recentCases,
      statusCounts,
      payments,
      dentistBalances,
    ] = await Promise.all([
      prisma.case.count({
        where: { ...tenantWhere, date: { gte: today, lt: tomorrow } },
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
      }),
      prisma.payment.aggregate({
        where: { dentist: { ...tenantWhere } },
        _sum: { amount: true },
      }),
      prisma.dentist.aggregate({
        where: { ...tenantWhere },
        _sum: { balance: true },
      }),
    ]);

    const totalIncome = payments._sum.amount || 0;
    const totalBalance = dentistBalances._sum.balance || 0;

    // Map statusCounts to statusBreakdown and derive pending/delivered cases in-memory
    const statusBreakdown = statusCounts.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    const statusCountsMap: Record<string, number> = {};
    for (const s of statusCounts) {
      statusCountsMap[s.status] = s._count.status;
    }

    const pendingCases =
      (statusCountsMap["RECEIVED"] || 0) +
      (statusCountsMap["WORKING"] || 0) +
      (statusCountsMap["TRIAL"] || 0);

    const deliveredCases = statusCountsMap["DELIVERED"] || 0;

    // Optimisation: Parallelize the monthly revenue queries (formerly sequential loops) with Promise.all
    // Also prevent Date rollover bugs (e.g., Jan 31st) by setting the date of month to 1 beforehand.
    const monthlyRevenuePromises = [];
    const monthlyRevenueMeta: { month: string; startOfMonth: Date; endOfMonth: Date }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1); // Avoid Javascript Date overflow/rollover bug
      d.setMonth(d.getMonth() - i);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      monthlyRevenueMeta.push({
        month: startOfMonth.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        startOfMonth,
        endOfMonth,
      });

      monthlyRevenuePromises.push(
        prisma.payment.aggregate({
          where: {
            dentist: { ...tenantWhere },
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        })
      );
    }

    const monthlyRevenueResults = await Promise.all(monthlyRevenuePromises);

    const monthlyRevenue = monthlyRevenueResults.map((monthPayments, idx) => {
      const meta = monthlyRevenueMeta[idx];
      return {
        month: meta.month,
        revenue: (monthPayments as { _sum: { amount: number | null } })._sum.amount || 0,
      };
    });

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
