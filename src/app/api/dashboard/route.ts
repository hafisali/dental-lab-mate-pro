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

    // Pre-calculate monthly ranges to parallelize queries
    const monthlyRanges = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      return {
        start: startOfMonth,
        end: endOfMonth,
        label: startOfMonth.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      };
    });

    /**
     * OPTIMIZATION (Bolt ⚡):
     * 1. Parallelized monthly revenue queries into the main Promise.all.
     * 2. Removed redundant count queries for pending/delivered cases, deriving them from the status groupBy result instead.
     * This reduces the total number of sequential database roundtrips and leverages the database more efficiently.
     */
    const [
      todayCases,
      recentCases,
      statusCounts,
      payments,
      dentistBalances,
      ...monthlyPaymentsResults
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
      ...monthlyRanges.map((range) =>
        prisma.payment.aggregate({
          where: {
            dentist: { ...tenantWhere },
            date: { gte: range.start, lte: range.end },
          },
          _sum: { amount: true },
        })
      ),
    ]);

    const totalIncome = payments._sum.amount || 0;
    const totalBalance = dentistBalances._sum.balance || 0;

    // Derive pending and delivered counts from statusCounts groupBy to save extra database calls
    const pendingCases = statusCounts
      .filter((s) => ["RECEIVED", "WORKING", "TRIAL"].includes(s.status))
      .reduce((sum, s) => sum + s._count.status, 0);

    const deliveredCases = statusCounts
      .filter((s) => s.status === "DELIVERED")
      .reduce((sum, s) => sum + s._count.status, 0);

    const statusBreakdown = statusCounts.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    // Map parallelized monthly revenue results
    const monthlyRevenue = monthlyRanges.map((range, index) => ({
      month: range.label,
      revenue: monthlyPaymentsResults[index]._sum.amount || 0,
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
