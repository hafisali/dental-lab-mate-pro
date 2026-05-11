import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface CaseSummary {
  id: string;
  caseNumber: string;
  dentist: { id: string; name: string };
  patient: { id: string; name: string } | null;
  workType: string;
  dueDate: Date | null;
  status: string;
}

interface TechStat {
  technicianId: string | null;
  status: string;
  _count: { status: number };
}

interface MonthVolume {
  month: string;
  year: number;
  count: number;
}

interface DentistStat {
  dentistId: string;
  _sum: { amount: number | null };
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
      return NextResponse.json({ error: "No lab assigned" }, { status: 400 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Prepare monthly volume queries
    const monthRanges = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      return { start, end, monthName: start.toLocaleString("en-IN", { month: "short" }), year: start.getFullYear() };
    }).reverse();

    // Parallel execution of all independent queries
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      allDeliveredCases,
      monthlyVolumesResults,
      topDentistsByCount,
      allTechnicians,
      techStatsGrouped,
      revenueThisMonthResult,
    ] = await Promise.all([
      // 1. Overdue cases
      prisma.case.findMany({
        where: {
          labId,
          dueDate: { lt: todayStart },
          status: { notIn: ["FINISHED", "DELIVERED"] },
        },
        include: {
          dentist: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseSummary[]>,

      // 2. Due soon cases
      prisma.case.findMany({
        where: {
          labId,
          dueDate: { gte: todayStart, lt: tomorrowEnd },
          status: { notIn: ["FINISHED", "DELIVERED"] },
        },
        include: {
          dentist: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseSummary[]>,

      // 3. Status breakdown
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),

      // 4. Work type breakdown
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),

      // 5. Delivered cases for turnaround and on-time rate
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),

      // 6. Monthly volumes
      Promise.all(monthRanges.map(range =>
        prisma.case.count({
          where: { labId, date: { gte: range.start, lt: range.end } }
        })
      )),

      // 7. Top dentists by count
      prisma.dentist.findMany({
        where: { labId, active: true },
        select: { id: true, name: true, clinicName: true, _count: { select: { cases: true } } },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),

      // 8. All technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // 9. Tech stats (grouped)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { status: true },
      }) as unknown as Promise<TechStat[]>,

      // 10. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),
    ]);

    // Post-processing
    const overdueWithDays = overdueCases.map((c) => ({
      ...c,
      daysOverdue: Math.ceil((now.getTime() - new Date(c.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    const dueSoonWithLabel = dueSoonCases.map((c) => ({
      ...c,
      dueLabel: new Date(c.dueDate!).getDate() === now.getDate() ? "Today" : "Tomorrow",
    }));

    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Performance metrics
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (allDeliveredCases.length > 0) {
      const totalDays = allDeliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / allDeliveredCases.length) * 10) / 10;

      const deliveredWithDue = allDeliveredCases.filter(c => c.dueDate !== null);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(c => new Date(c.updatedAt) <= new Date(c.dueDate!)).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    const monthlyCaseVolumes: MonthVolume[] = monthRanges.map((range, i) => ({
      month: range.monthName,
      year: range.year,
      count: monthlyVolumesResults[i],
    }));

    // Top dentists revenue (separate grouped query for efficiency)
    const topDentistIds = topDentistsByCount.map(d => d.id);
    const dentistRevenue = await (prisma.case.groupBy({
      by: ["dentistId"],
      where: { dentistId: { in: topDentistIds } },
      _sum: { amount: true },
    }) as unknown as Promise<DentistStat[]>);

    const revenueMap = new Map(dentistRevenue.map(r => [r.dentistId, r._sum.amount || 0]));
    const topDentistData = topDentistsByCount.map(d => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: revenueMap.get(d.id) || 0,
    }));

    // Correlate tech workload
    const techStatsMap = new Map<string, { active: number; completed: number }>();
    techStatsGrouped.forEach(stat => {
      if (!stat.technicianId) return;
      const current = techStatsMap.get(stat.technicianId) || { active: 0, completed: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        current.completed += stat._count.status;
      } else {
        current.active += stat._count.status;
      }
      techStatsMap.set(stat.technicianId, current);
    });

    const techWorkload = allTechnicians.map(tech => ({
      id: tech.id,
      name: tech.name,
      activeCases: techStatsMap.get(tech.id)?.active || 0,
      completedCases: techStatsMap.get(tech.id)?.completed || 0,
    }));

    return NextResponse.json({
      overdueCases: overdueWithDays,
      dueSoonCases: dueSoonWithLabel,
      statusCounts,
      workTypeCounts,
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes,
      topDentists: topDentistData,
      techWorkload,
      casesThisMonth: monthlyVolumesResults[monthlyVolumesResults.length - 1], // Last month is current
      revenueThisMonth: revenueThisMonthResult._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
