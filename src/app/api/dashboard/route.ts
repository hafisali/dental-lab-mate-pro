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

    // Prepare ranges for last 6 months revenue
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      };
    });

    const [
      todayCases,
      recentCases,
      statusCounts,
      payments,
      dentistBalances,
      ...monthlyRevenueData
    ] = await Promise.all([
      // 1. Today's cases count
      prisma.case.count({
        where: { ...tenantWhere, date: { gte: today, lt: tomorrow } },
      }),
      // 2. Recent cases for the list
      prisma.case.findMany({
        where: { ...tenantWhere },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          dentist: { select: { id: true, name: true, clinicName: true } },
          patient: { select: { id: true, name: true } },
        },
      }),
      // 3. Status breakdown (also used to derive pending/delivered counts)
      prisma.case.groupBy({
        by: ["status"],
        where: { ...tenantWhere },
        _count: { status: true },
      }),
      // 4. Total income aggregate
      prisma.payment.aggregate({
        where: { dentist: { ...tenantWhere } },
        _sum: { amount: true },
      }),
      // 5. Total balance aggregate
      prisma.dentist.aggregate({
        where: { ...tenantWhere },
        _sum: { balance: true },
      }),
      // 6-11. Parallelized monthly revenue queries
      ...months.map((m) =>
        prisma.payment.aggregate({
          where: {
            dentist: { ...tenantWhere },
            date: { gte: m.start, lte: m.end },
          },
          _sum: { amount: true },
        })
      ),
    ]);

    const totalIncome = (payments as { _sum: { amount: number | null } })._sum.amount || 0;
    const totalBalance = (dentistBalances as { _sum: { balance: number | null } })._sum.balance || 0;

    // Map status counts for quick lookup
    const statusMap = Object.fromEntries(
      (statusCounts as { status: string; _count: { status: number } }[]).map((s) => [
        s.status,
        s._count.status,
      ])
    );

    // Derive metrics from statusCounts instead of redundant queries
    const pendingCases =
      (statusMap["RECEIVED"] || 0) + (statusMap["WORKING"] || 0) + (statusMap["TRIAL"] || 0);
    const deliveredCases = statusMap["DELIVERED"] || 0;

    const statusBreakdown = (
      statusCounts as { status: string; _count: { status: number } }[]
    ).map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    // Map parallelized revenue results to the expected format
    const monthlyRevenue = months.map((m, i) => ({
      month: m.start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      revenue:
        (monthlyRevenueData[i] as { _sum: { amount: number | null } })._sum.amount || 0,
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
