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

    // Prepare monthly ranges for the last 6 months
    const monthlyRanges = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1); // Set to 1st to avoid month-skipping bugs on 31st
      d.setMonth(d.getMonth() - (5 - i));
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      return { startOfMonth, endOfMonth };
    });

    const [
      todayCases,
      pendingCases,
      deliveredCases,
      recentCases,
      statusCounts,
      payments,
      dentistBalances,
      ...monthlyPaymentsResults
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
      }),
      prisma.payment.aggregate({
        where: { dentist: { ...tenantWhere } },
        _sum: { amount: true },
      }),
      prisma.dentist.aggregate({
        where: { ...tenantWhere },
        _sum: { balance: true },
      }),
      // Parallelize monthly revenue queries
      ...monthlyRanges.map((range) =>
        prisma.payment.aggregate({
          where: {
            dentist: { ...tenantWhere },
            date: { gte: range.startOfMonth, lte: range.endOfMonth },
          },
          _sum: { amount: true },
        })
      ),
    ]);

    const totalIncome = payments._sum.amount || 0;
    const totalBalance = dentistBalances._sum.balance || 0;

    const statusBreakdown = statusCounts.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    // Reconstruct monthly revenue data
    const monthlyRevenue = monthlyRanges.map((range, i) => {
      const result = monthlyPaymentsResults[i] as { _sum: { amount: number | null } };
      return {
        month: range.startOfMonth.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        revenue: result._sum.amount || 0,
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
