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

interface StatusCount {
  status: string;
  _count: { id: number };
}

interface WorkTypeCount {
  workType: string;
  _count: { id: number };
}

interface TechStat {
  technicianId: string | null;
  status: string;
  _count: { id: number };
}

interface MonthVolume {
  month: string;
  year: number;
  count: number;
}

interface DentistStat {
  dentistId: string;
  _count: { id: number };
}

interface DentistRevenue {
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
    const tomorrowEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2
    );
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Prepare monthly volume ranges (last 6 months)
    const monthRanges = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      monthRanges.push({
        start: monthStart,
        end: monthEnd,
        name: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear(),
      });
    }

    // ⚡ Execute all independent database queries in parallel using a 2-layer Promise.all architecture
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCasesData,
      monthlyCounts,
      topDentistData,
      allTechnicians,
      techStatsRaw,
      revenueThisMonthAggregate,
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

      // 3. Cases by status count
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }) as unknown as Promise<StatusCount[]>,

      // 4. Cases by work type count
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }) as unknown as Promise<WorkTypeCount[]>,

      // 5. Consolidated delivered cases for metrics
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),

      // 6. Monthly case volumes (parallelized counts)
      Promise.all(
        monthRanges.map((range) =>
          prisma.case.count({
            where: { labId, date: { gte: range.start, lt: range.end } },
          })
        )
      ),

      // 7. Top dentists (2-stage optimized fetch)
      (async () => {
        const top10 = await (prisma.case.groupBy({
          by: ["dentistId"],
          _count: { id: true },
          where: { labId, dentist: { active: true } },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }) as unknown as Promise<DentistStat[]>);

        if (top10.length === 0) return [];

        const ids = top10.map((d) => d.dentistId);
        const [details, revenue] = await Promise.all([
          prisma.dentist.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, clinicName: true },
          }),
          prisma.case.groupBy({
            by: ["dentistId"],
            _sum: { amount: true },
            where: { dentistId: { in: ids } },
          }) as unknown as Promise<DentistRevenue[]>,
        ]);

        const detailMap = new Map(details.map((d) => [d.id, d]));
        const revenueMap = new Map(revenue.map((r) => [r.dentistId, r._sum.amount || 0]));

        return top10.map((d) => ({
          id: d.dentistId,
          name: detailMap.get(d.dentistId)?.name || "Unknown",
          clinicName: detailMap.get(d.dentistId)?.clinicName || null,
          caseCount: d._count.id,
          revenue: revenueMap.get(d.dentistId) || 0,
        }));
      })(),

      // 8. All technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // 9. Technician stats (consolidated groupBy to avoid N+1)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        _count: { id: true },
        where: { labId, technicianId: { not: null } },
      }) as unknown as Promise<TechStat[]>,

      // 10. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
    ]);

    // --- Post-processing ---

    // 1. Overdue with days calculation
    const overdueWithDays = overdueCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const diffTime = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        id: c.id,
        caseNumber: c.caseNumber,
        dentist: c.dentist,
        patient: c.patient,
        workType: c.workType,
        dueDate: c.dueDate,
        status: c.status,
        daysOverdue,
      };
    });

    // 2. Due soon with label assignment
    const dueSoonWithLabel = dueSoonCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const isToday =
        dueDate.getDate() === now.getDate() &&
        dueDate.getMonth() === now.getMonth() &&
        dueDate.getFullYear() === now.getFullYear();
      return {
        id: c.id,
        caseNumber: c.caseNumber,
        dentist: c.dentist,
        patient: c.patient,
        workType: c.workType,
        dueDate: c.dueDate,
        status: c.status,
        dueLabel: isToday ? "Today" : "Tomorrow",
      };
    });

    // 3. Status counts mapping
    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    // 4. Work type counts mapping
    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // 5. Avg Turnaround & On-time Rate (efficient single-pass over consolidated data)
    let totalDays = 0;
    let onTimeCount = 0;
    let deliveredWithDueCount = 0;

    deliveredCasesData.forEach((c) => {
      // Turnaround calculation
      const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
      totalDays += diff / (1000 * 60 * 60 * 24);

      // On-time rate calculation
      if (c.dueDate) {
        deliveredWithDueCount++;
        if (new Date(c.updatedAt) <= new Date(c.dueDate)) {
          onTimeCount++;
        }
      }
    });

    const avgTurnaround = deliveredCasesData.length > 0
      ? Math.round((totalDays / deliveredCasesData.length) * 10) / 10
      : 0;
    const onTimeRate = deliveredWithDueCount > 0
      ? Math.round((onTimeCount / deliveredWithDueCount) * 100)
      : 0;

    // 6. Monthly Volumes mapping
    const monthlyCaseVolumes: MonthVolume[] = monthRanges.map((range, index) => ({
      month: range.name,
      year: range.year,
      count: monthlyCounts[index],
    }));

    // 9. Technician Workload correlation
    const techWorkloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    techStatsRaw.forEach((stat) => {
      if (!stat.technicianId) return;
      const current = techWorkloadMap.get(stat.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        current.completedCases += stat._count.id;
      } else {
        current.activeCases += stat._count.id;
      }
      techWorkloadMap.set(stat.technicianId, current);
    });

    const techWorkload = allTechnicians.map((tech) => {
      const stats = techWorkloadMap.get(tech.id) || { activeCases: 0, completedCases: 0 };
      return {
        id: tech.id,
        name: tech.name,
        ...stats,
      };
    });

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
      casesThisMonth: monthlyCounts[monthlyCounts.length - 1], // Optimization: reuse current month count from time-series
      revenueThisMonth: revenueThisMonthAggregate._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
