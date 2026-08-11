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

    // PERFORMANCE OPTIMIZATION:
    // 1. We removed redundant database count queries for pending and delivered cases.
    //    These counts are now derived in-memory from the already-fetched `statusCounts` groupBy results.
    // 2. We consolidated payments and dentist balances aggregations to happen in parallel with other queries.
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

    const statusBreakdown = statusCounts.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    // Derive pending and delivered cases in-memory from `statusCounts` map to avoid redundant database calls.
    const statusMap = Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count.status])
    );
    const pendingCases = (statusMap["RECEIVED"] || 0) + (statusMap["WORKING"] || 0) + (statusMap["TRIAL"] || 0);
    const deliveredCases = statusMap["DELIVERED"] || 0;

    // Monthly revenue (last 6 months)
    // PERFORMANCE OPTIMIZATION: Querying monthly aggregations in parallel via Promise.all
    // instead of sequential N+1 database round trips.
    const monthRanges = Array.from({ length: 6 }, (_, idx) => {
      const i = 5 - idx;
      const d = new Date();
      // Set date to 1st of the month to prevent JS month rollover bugs on 31-day months (e.g. Jan 31 -> March)
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthLabel = startOfMonth.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      return { startOfMonth, endOfMonth, monthLabel };
    });

    const monthPaymentsQueries = monthRanges.map((range) =>
      prisma.payment.aggregate({
        where: {
          dentist: { ...tenantWhere },
          date: { gte: range.startOfMonth, lte: range.endOfMonth },
        },
        _sum: { amount: true },
      })
    );

    const monthPaymentsResults = (await Promise.all(monthPaymentsQueries)) as {
      _sum: { amount: number | null };
    }[];

    const monthlyRevenue = monthRanges.map((range, idx) => ({
      month: range.monthLabel,
      revenue: monthPaymentsResults[idx]._sum.amount || 0,
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
