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

    const [
      todayCases,
      recentCases,
      statusCounts,
      payments,
      dentistBalances,
    ] = await Promise.all([
      // Count today's cases
      prisma.case.count({
        where: { ...tenantWhere, date: { gte: today, lt: tomorrow } },
      }),
      // Retrieve 10 most recent cases
      prisma.case.findMany({
        where: { ...tenantWhere },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          dentist: { select: { id: true, name: true, clinicName: true } },
          patient: { select: { id: true, name: true } },
        },
      }),
      // Group by status to fetch all status-related counts in a single query
      prisma.case.groupBy({
        by: ["status"],
        where: { ...tenantWhere },
        _count: { status: true },
      }),
      // Sum payments (total income)
      prisma.payment.aggregate({
        where: { dentist: { ...tenantWhere } },
        _sum: { amount: true },
      }),
      // Sum dentist balances
      prisma.dentist.aggregate({
        where: { ...tenantWhere },
        _sum: { balance: true },
      }),
    ]);

    const totalIncome = payments._sum.amount || 0;
    const totalBalance = dentistBalances._sum.balance || 0;

    // Derived counts from the single groupBy statusCounts query, eliminating 2 redundant database counts
    let pendingCases = 0;
    let deliveredCases = 0;
    const pendingStatuses = ["RECEIVED", "WORKING", "TRIAL"];
    statusCounts.forEach((s) => {
      if (s.status === "DELIVERED") {
        deliveredCases = s._count.status;
      } else if (pendingStatuses.includes(s.status)) {
        pendingCases += s._count.status;
      }
    });

    const statusBreakdown = statusCounts.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    // Monthly revenue (last 6 months) - parallelized Promise.all to eliminate sequential loop round-trips
    const monthlyRevenuePromises = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      // Always set day to 1 before setMonth to avoid date rollover/underflow overflow bugs on months with 31 days
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      monthlyRevenuePromises.push(
        prisma.payment.aggregate({
          where: {
            dentist: { ...tenantWhere },
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        }).then((monthPayments) => ({
          month: startOfMonth.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          revenue: monthPayments._sum.amount || 0,
        }))
      );
    }
    const monthlyRevenue = await Promise.all(monthlyRevenuePromises);

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
