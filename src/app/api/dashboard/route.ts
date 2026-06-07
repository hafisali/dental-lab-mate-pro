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

    // Parallelize all top-level metrics and monthly revenue fetches to reduce database round-trips
    const [
      todayCases,
      recentCases,
      statusCounts,
      payments,
      dentistBalances,
      monthlyRevenue,
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
      // Parallelize monthly revenue fetches (last 6 months)
      Promise.all(
        Array.from({ length: 6 }, (_, index) => {
          const i = 5 - index;
          const d = new Date();
          d.setDate(1); // Avoid month skipping bug on the 31st
          d.setMonth(d.getMonth() - i);
          const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
          const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

          return prisma.payment.aggregate({
            where: {
              dentist: { ...tenantWhere },
              date: { gte: startOfMonth, lte: endOfMonth },
            },
            _sum: { amount: true },
          }).then(monthPayments => ({
            month: startOfMonth.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
            revenue: monthPayments._sum.amount || 0,
          }));
        })
      ),
    ]);

    const totalIncome = payments._sum.amount || 0;
    const totalBalance = dentistBalances._sum.balance || 0;

    // Derived metrics from statusCounts to avoid redundant database queries
    const statusBreakdown = statusCounts.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    const pendingCases = statusCounts
      .filter((s) => ["RECEIVED", "WORKING", "TRIAL"].includes(s.status))
      .reduce((sum, s) => sum + s._count.status, 0);

    const deliveredCases = statusCounts.find((s) => s.status === "DELIVERED")?._count.status || 0;

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
