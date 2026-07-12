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

    // Last 6 months range preparation
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      return {
        start,
        end,
        label: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      };
    });

    /**
     * PERFORMANCE OPTIMIZATION:
     * 1. Combined all database queries into a single Promise.all block.
     * 2. Derived pending/delivered counts from the status breakdown to save 2 redundant DB calls.
     * 3. Parallelized 6 months of revenue queries.
     * Total sequential DB round-trips reduced from ~8 to 1.
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
      }) as Promise<{ _sum: { amount: number | null } }>,
      prisma.dentist.aggregate({
        where: { ...tenantWhere },
        _sum: { balance: true },
      }) as Promise<{ _sum: { balance: number | null } }>,
      // Parallel monthly revenue
      ...months.map((m) =>
        prisma.payment.aggregate({
          where: {
            dentist: { ...tenantWhere },
            date: { gte: m.start, lte: m.end },
          },
          _sum: { amount: true },
        }) as Promise<{ _sum: { amount: number | null } }>
      ),
    ]);

    // Derive metrics in-memory from status breakdown
    const statusMap = Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count.status])
    );
    const pendingCases =
      (statusMap["RECEIVED"] || 0) +
      (statusMap["WORKING"] || 0) +
      (statusMap["TRIAL"] || 0);
    const deliveredCases = statusMap["DELIVERED"] || 0;

    const totalIncome = payments._sum.amount || 0;
    const totalBalance = dentistBalances._sum.balance || 0;

    const statusBreakdown = statusCounts.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    const monthlyRevenue = months.map((m, i) => ({
      month: m.label,
      revenue: (monthlyPaymentsResults[i] as { _sum: { amount: number | null } })._sum.amount || 0,
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
