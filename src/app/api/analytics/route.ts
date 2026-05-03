import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

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

interface DentistRevenue {
  dentistId: string;
  _sum: { amount: number | null };
}

interface CaseMinimal {
  id: string;
  caseNumber: string;
  dentist: { id: string; name: string };
  patient: { id: string; name: string } | null;
  workType: string;
  dueDate: Date | null;
  status: string;
}

interface TopDentist {
  id: string;
  name: string;
  clinicName: string | null;
  _count: { cases: number };
}

export async function GET(req: NextRequest) {
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

    const monthRanges: { monthStart: Date; monthEnd: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      monthRanges.push({ monthStart, monthEnd });
    }

    // Parallelize all independent database queries to minimize latency
    const results = await Promise.all([
      // 0: Overdue cases
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
      // 1: Due soon cases
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
      // 2: Cases by status
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),
      // 3: Cases by work type
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),
      // 4: Delivered cases for turnaround
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true },
      }),
      // 5: Delivered cases with due date for on-time rate
      prisma.case.findMany({
        where: { labId, status: "DELIVERED", dueDate: { not: null } },
        select: { dueDate: true, updatedAt: true },
      }),
      // 6: Top dentists (by case count)
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: { _count: { select: { cases: true } } },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),
      // 7: Dentist revenue aggregation
      prisma.case.groupBy({
        by: ["dentistId"],
        _sum: { amount: true },
        where: { labId },
      }),
      // 8: All technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // 9: Technician workload aggregation (N+1 fix)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        _count: { id: true },
        where: { labId },
      }),
      // 10: Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
      // 11-16: Monthly case volumes
      ...monthRanges.map((r) =>
        prisma.case.count({
          where: { labId, date: { gte: r.monthStart, lt: r.monthEnd } },
        })
      ),
    ]);

    // Cast results to appropriate types using unknown to satisfy strict linting
    const overdueCases = results[0] as unknown as CaseMinimal[];
    const dueSoonCases = results[1] as unknown as CaseMinimal[];
    const casesByStatus = results[2] as unknown as StatusCount[];
    const casesByWorkType = results[3] as unknown as WorkTypeCount[];
    const deliveredCases = results[4] as unknown as { createdAt: Date; updatedAt: Date }[];
    const deliveredWithDue = results[5] as unknown as { dueDate: Date; updatedAt: Date }[];
    const topDentists = results[6] as unknown as TopDentist[];
    const dentistRevenue = results[7] as unknown as DentistRevenue[];
    const allTechnicians = results[8] as unknown as { id: string; name: string }[];
    const techStats = results[9] as unknown as TechStat[];
    const revenueThisMonthResult = results[10] as { _sum: { amount: number | null } };
    const monthlyCounts = results.slice(11) as number[];

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

    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    let avgTurnaround = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;
    }

    let onTimeRate = 0;
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    const monthlyCaseVolumes = monthRanges.map((r, idx) => ({
      month: r.monthStart.toLocaleString("en-IN", { month: "short" }),
      year: r.monthStart.getFullYear(),
      count: monthlyCounts[idx],
    }));

    // Post-process top dentists data with O(1) revenue lookup
    const dentistRevenueMap = new Map(
      dentistRevenue.map((r) => [r.dentistId, r._sum.amount || 0])
    );
    const topDentistData = topDentists.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: dentistRevenueMap.get(d.id) || 0,
    }));

    // Post-process technician workload with O(1) status lookups
    const techStatsMap = new Map<string, { active: number; completed: number }>();
    techStats.forEach((s) => {
      if (!s.technicianId) return;
      const stats = techStatsMap.get(s.technicianId) || { active: 0, completed: 0 };
      if (["FINISHED", "DELIVERED"].includes(s.status)) {
        stats.completed += s._count.id;
      } else {
        stats.active += s._count.id;
      }
      techStatsMap.set(s.technicianId, stats);
    });

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
      casesThisMonth: monthlyCounts[5], // Reused from monthly counts
      revenueThisMonth: revenueThisMonthResult._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
