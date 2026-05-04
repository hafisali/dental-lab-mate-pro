import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

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
    const tomorrowEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2
    );
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Prepare date ranges for monthly volumes
    const monthlyRanges = Array.from({ length: 6 }, (_, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      return { monthStart, monthEnd };
    });

    // Parallelize ALL independent database queries
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      deliveredWithDue,
      monthlyCounts,
      techStatsRaw,
      allTechnicians,
      dentistStatsRaw,
      casesThisMonth,
      revenueThisMonth,
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
      }),

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
      }),

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

      // 5. Delivered cases (for turnaround time)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true },
      }),

      // 6. Delivered cases with due dates (for on-time rate)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED", dueDate: { not: null } },
        select: { dueDate: true, updatedAt: true },
      }),

      // 7. Monthly volumes
      Promise.all(
        monthlyRanges.map((range) =>
          prisma.case.count({
            where: { labId, date: { gte: range.monthStart, lt: range.monthEnd } },
          })
        )
      ),

      // 8. Tech workload stats
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>,

      // 9. Active technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // 10. Top dentists stats (aggregated)
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId },
        _count: { id: true },
        _sum: { amount: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }) as unknown as Promise<DentistStat[]>,

      // 11. Cases this month
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),

      // 12. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),
    ]);

    // --- Post-processing (In-memory) ---

    // 1. Overdue formatting
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

    // 2. Due soon formatting
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

    // 3. Status mapping
    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    // 4. Work type mapping
    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // 5. Avg turnaround calculation
    let avgTurnaround = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;
    }

    // 6. On-time rate calculation
    let onTimeRate = 0;
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    // 7. Monthly volume mapping
    const monthlyCaseVolumes = monthlyRanges.map((range, i) => ({
      month: range.monthStart.toLocaleString("en-IN", { month: "short" }),
      year: range.monthStart.getFullYear(),
      count: monthlyCounts[i],
    }));

    // 8. Dentist details & data mapping
    const topDentistsInfo = await prisma.dentist.findMany({
      where: { id: { in: dentistStatsRaw.map((d) => d.dentistId) } },
      select: { id: true, name: true, clinicName: true },
    });

    const dentistMap = new Map(topDentistsInfo.map((d) => [d.id, d]));
    const topDentistData = dentistStatsRaw.map((stat) => {
      const details = dentistMap.get(stat.dentistId);
      return {
        id: stat.dentistId,
        name: details?.name || "Unknown",
        clinicName: details?.clinicName,
        caseCount: stat._count.id,
        revenue: stat._sum.amount || 0,
      };
    });

    // 9. Tech workload mapping
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
      overdueCases: overdueWithDays,
      dueSoonCases: dueSoonWithLabel,
      statusCounts,
      workTypeCounts,
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes,
      topDentists: topDentistData,
      techWorkload,
      casesThisMonth,
      revenueThisMonth: revenueThisMonth._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
