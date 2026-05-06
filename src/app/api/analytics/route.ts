import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface StatusStat {
  status: string;
  _count: { id: number };
}

interface WorkTypeStat {
  workType: string;
  _count: { id: number };
}

interface TechStat {
  technicianId: string | null;
  status: string;
  _count: { id: number };
}

interface DentistStat {
  dentistId: string;
  _count: { id: number };
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

    // Prepare time-series promises (last 6 months)
    const monthlyPromises = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      monthlyPromises.push(
        prisma.case.count({
          where: {
            labId,
            date: { gte: monthStart, lt: monthEnd },
          },
        })
      );
    }

    // Parallelize all primary data fetches
    const [
      activeAndUpcomingCases,
      casesByStatusRaw,
      casesByWorkTypeRaw,
      deliveredCasesData,
      techStatsRaw,
      dentistStatsRaw,
      allTechnicians,
      revenueThisMonthResult,
      ...monthlyCounts
    ] = await Promise.all([
      // 1. Overdue and Due Soon cases combined
      prisma.case.findMany({
        where: {
          labId,
          dueDate: { lt: tomorrowEnd },
          status: { notIn: ["FINISHED", "DELIVERED"] },
        },
        include: {
          dentist: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      }),
      // 2. Cases by status
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }) as unknown as Promise<StatusStat[]>,
      // 3. Cases by work type
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }) as unknown as Promise<WorkTypeStat[]>,
      // 4. Delivered cases for performance metrics
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // 5. Tech workload stats (grouped)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>,
      // 6. Dentist stats (grouped)
      prisma.case.groupBy({
        by: ["dentistId"],
        _count: { id: true },
        _sum: { amount: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }) as unknown as Promise<DentistStat[]>,
      // 7. Active technicians list
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // 8. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
      // 9+. Monthly volume counts
      ...monthlyPromises,
    ]);

    // Post-process: Overdue vs Due Soon
    const overdueCases = [];
    const dueSoonCases = [];
    for (const c of activeAndUpcomingCases) {
      const dueDate = new Date(c.dueDate!);
      if (dueDate < todayStart) {
        const diffTime = now.getTime() - dueDate.getTime();
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        overdueCases.push({
          id: c.id,
          caseNumber: c.caseNumber,
          dentist: c.dentist,
          patient: c.patient,
          workType: c.workType,
          dueDate: c.dueDate,
          status: c.status,
          daysOverdue,
        });
      } else {
        const isToday =
          dueDate.getDate() === now.getDate() &&
          dueDate.getMonth() === now.getMonth() &&
          dueDate.getFullYear() === now.getFullYear();
        dueSoonCases.push({
          id: c.id,
          caseNumber: c.caseNumber,
          dentist: c.dentist,
          patient: c.patient,
          workType: c.workType,
          dueDate: c.dueDate,
          status: c.status,
          dueLabel: isToday ? "Today" : "Tomorrow",
        });
      }
    }

    // Post-process: Status & Work Type
    const statusCounts = casesByStatusRaw.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCounts = casesByWorkTypeRaw.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Post-process: Performance Metrics
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredCasesData.length > 0) {
      let totalDays = 0;
      let onTimeCount = 0;
      let casesWithDueCount = 0;

      for (const c of deliveredCasesData) {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        totalDays += diff / (1000 * 60 * 60 * 24);

        if (c.dueDate) {
          casesWithDueCount++;
          if (new Date(c.updatedAt) <= new Date(c.dueDate)) {
            onTimeCount++;
          }
        }
      }
      avgTurnaround = Math.round((totalDays / deliveredCasesData.length) * 10) / 10;
      onTimeRate = casesWithDueCount > 0 ? Math.round((onTimeCount / casesWithDueCount) * 100) : 0;
    }

    // Post-process: Monthly volumes
    const monthlyCaseVolumes = monthlyCounts.map((count, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear(),
        count,
      };
    });

    // Reuse last month's count for "cases this month"
    const casesThisMonth = monthlyCounts[5];

    // Post-process: Top Dentists
    const topDentistIds = dentistStatsRaw.map((d) => d.dentistId);
    const topDentistDetails = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true },
    });
    const dentistMap = new Map(topDentistDetails.map((d) => [d.id, d]));

    const topDentists = dentistStatsRaw.map((stat) => {
      const details = dentistMap.get(stat.dentistId);
      return {
        id: stat.dentistId,
        name: details?.name || "Unknown",
        clinicName: details?.clinicName || null,
        caseCount: stat._count.id,
        revenue: stat._sum.amount || 0,
      };
    });

    // Post-process: Tech Workload
    const techStatsMap = new Map<string, { active: number; completed: number }>();
    for (const stat of techStatsRaw) {
      if (!stat.technicianId) continue;
      const current = techStatsMap.get(stat.technicianId) || { active: 0, completed: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        current.completed += stat._count.id;
      } else {
        current.active += stat._count.id;
      }
      techStatsMap.set(stat.technicianId, current);
    }

    const techWorkload = allTechnicians.map((tech) => {
      const stats = techStatsMap.get(tech.id) || { active: 0, completed: 0 };
      return {
        id: tech.id,
        name: tech.name,
        activeCases: stats.active,
        completedCases: stats.completed,
      };
    });

    return NextResponse.json({
      overdueCases,
      dueSoonCases,
      statusCounts,
      workTypeCounts,
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes,
      topDentists,
      techWorkload,
      casesThisMonth,
      revenueThisMonth: revenueThisMonthResult._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
