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

    // OPTIMIZATION: Consolidate redundant count queries and fetch core dashboard metrics in parallel.
    // By grouping cases by status, we can compute total pending and delivered cases in-memory.
    // This reduces the number of database queries in this block from 7 to 5.
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

    // Derive breakdown and populate lookup map to compute pending/delivered cases in-memory.
    const statusMap: Record<string, number> = {};
    const statusBreakdown = statusCounts.map((s) => {
      statusMap[s.status] = s._count.status;
      return {
        status: s.status,
        count: s._count.status,
      };
    });

    const pendingCases =
      (statusMap["RECEIVED"] || 0) +
      (statusMap["WORKING"] || 0) +
      (statusMap["TRIAL"] || 0);
    const deliveredCases = statusMap["DELIVERED"] || 0;

    // OPTIMIZATION: Parallelize the 6 monthly revenue aggregate queries.
    // Instead of querying sequentially in a loop (which causes 6 blocking sequential DB round-trips),
    // we build the date ranges first and query them concurrently using Promise.all.
    const monthsData = Array.from({ length: 6 }, (_, idx) => {
      const i = 5 - idx;
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = startOfMonth.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      return { startOfMonth, endOfMonth, label };
    });

    const monthlyRevenueResults = await Promise.all(
      monthsData.map((m) =>
        prisma.payment.aggregate({
          where: {
            dentist: { ...tenantWhere },
            date: { gte: m.startOfMonth, lte: m.endOfMonth },
          },
          _sum: { amount: true },
        })
      )
    );

    const monthlyRevenue = monthsData.map((m, idx) => {
      const res = monthlyRevenueResults[idx] as { _sum: { amount: number | null } };
      return {
        month: m.label,
        revenue: res._sum.amount || 0,
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
