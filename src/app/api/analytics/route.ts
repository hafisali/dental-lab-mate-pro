import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

// Optimized interfaces for database results to ensure type safety without 'any'
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
  _count: { id: number };
}

interface RevenueStat {
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

    // Optimized: Parallelizing all independent database queries into a single block
    // Reduces sequential database round-trips from ~20+ to 1 sequential block of work.
    const [
      overdueCasesRaw,
      dueSoonCasesRaw,
      casesByStatus,
      casesByWorkType,
      deliveredCasesData,
      topDentists,
      allTechnicians,
      techStatsRaw,
      casesThisMonth,
      revenueThisMonth,
      ...monthlyVolumesRaw
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

      // 3. Status counts
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),

      // 4. Work type counts
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),

      // 5. Consolidated delivered cases (Optimized: single query for turnaround and on-time rate)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),

      // 6. Top dentists
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: {
          _count: { select: { cases: true } },
          cases: { select: { amount: true } },
        },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),

      // 7. Technicians list
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // 8. Technician workload (Optimized: single groupBy vs original N+1 loop)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        _count: { id: true },
        where: { labId, technicianId: { not: null } },
      }) as unknown as Promise<TechStat[]>,

      // 9. Cases this month
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),

      // 10. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),

      // 11. Monthly volumes (Optimized: Parallelized count promises)
      ...Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        return prisma.case.count({
          where: { labId, date: { gte: start, lt: end } },
        });
      }),
    ]);

    // --- Post-query Data Processing ---

    const overdueWithDays = (overdueCasesRaw as CaseSummary[]).map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      dentist: c.dentist,
      patient: c.patient,
      workType: c.workType,
      dueDate: c.dueDate,
      status: c.status,
      daysOverdue: Math.ceil((now.getTime() - new Date(c.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    const dueSoonWithLabel = (dueSoonCasesRaw as CaseSummary[]).map((c) => {
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

    // Performance: Single pass over delivered cases for dual metrics calculation
    let totalTurnaroundDays = 0;
    let onTimeCount = 0;
    let deliveredWithDueCount = 0;

    deliveredCasesData.forEach((c) => {
      const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
      totalTurnaroundDays += diff / (1000 * 60 * 60 * 24);

      if (c.dueDate) {
        deliveredWithDueCount++;
        if (new Date(c.updatedAt) <= new Date(c.dueDate)) {
          onTimeCount++;
        }
      }
    });

    const avgTurnaround = deliveredCasesData.length > 0
      ? Math.round((totalTurnaroundDays / deliveredCasesData.length) * 10) / 10
      : 0;

    const onTimeRate = deliveredWithDueCount > 0
      ? Math.round((onTimeCount / deliveredWithDueCount) * 100)
      : 0;

    const monthlyCaseVolumes = monthlyVolumesRaw.map((count, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: d.toLocaleString("en-IN", { month: "short" }),
        year: d.getFullYear(),
        count: count as number,
      };
    });

    const topDentistData = topDentists.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
    }));

    // Performance: Map-based correlation for technician workload (O(T+S) vs original O(T*2Queries))
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

    const techWorkload = allTechnicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
      ...(techWorkloadMap.get(tech.id) || { activeCases: 0, completedCases: 0 }),
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
      casesThisMonth,
      revenueThisMonth: (revenueThisMonth as RevenueStat)._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
