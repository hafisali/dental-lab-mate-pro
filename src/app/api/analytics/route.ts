import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";
import { CaseStatus } from "@prisma/client";

interface CaseSummary {
  id: string;
  caseNumber: string;
  dentist: { id: string; name: string };
  patient: { id: string; name: string } | null;
  workType: string;
  dueDate: Date | null;
  status: CaseStatus;
}

interface StatusCount {
  status: CaseStatus;
  _count: { id: number };
}

interface WorkTypeCount {
  workType: string;
  _count: { id: number };
}

interface TechStat {
  technicianId: string | null;
  status: CaseStatus;
  _count: { id: number };
}

interface DentistRevenueStat {
  dentistId: string | null;
  _sum: { amount: number | null };
}

interface DentistSummary {
  id: string;
  name: string;
  clinicName: string | null;
  _count: { cases: number };
}

/**
 * Optimized Analytics API:
 * - Reduced sequential database round-trips from ~20 to 1 using 2-layer Promise.all
 * - Replaced N+1 technician workload queries with a single Prisma groupBy
 * - Parallelized 6-month time-series queries
 * - Fixed potential date rollover bug in monthly volume calculations
 */
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

    // Prepare monthly volume promises
    const monthlyVolumePromises = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      d.setMonth(d.getMonth() - (5 - i));
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthName = monthStart.toLocaleString("en-IN", { month: "short" });
      const year = monthStart.getFullYear();

      return prisma.case.count({
        where: {
          labId,
          date: { gte: monthStart, lt: monthEnd },
        },
      }).then(count => ({ month: monthName, year, count }));
    });

    // Execute all independent queries in parallel
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      deliveredWithDue,
      topDentistsRaw,
      dentistRevenueRaw,
      allTechnicians,
      techWorkloadRaw,
      casesThisMonth,
      revenueThisMonth,
      monthlyCaseVolumes,
    ] = await Promise.all([
      // Overdue cases
      prisma.case.findMany({
        where: {
          labId,
          dueDate: { lt: todayStart },
          status: { notIn: ["FINISHED", "DELIVERED"] },
        },
        select: {
          id: true,
          caseNumber: true,
          dentist: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true } },
          workType: true,
          dueDate: true,
          status: true,
        },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseSummary[]>,

      // Due soon cases
      prisma.case.findMany({
        where: {
          labId,
          dueDate: { gte: todayStart, lt: tomorrowEnd },
          status: { notIn: ["FINISHED", "DELIVERED"] },
        },
        select: {
          id: true,
          caseNumber: true,
          dentist: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true } },
          workType: true,
          dueDate: true,
          status: true,
        },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseSummary[]>,

      // Status counts
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }) as unknown as Promise<StatusCount[]>,

      // Work type counts
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }) as unknown as Promise<WorkTypeCount[]>,

      // Avg turnaround data
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true },
      }),

      // On-time rate data
      prisma.case.findMany({
        where: { labId, status: "DELIVERED", dueDate: { not: null } },
        select: { dueDate: true, updatedAt: true },
      }),

      // Top dentists by case count
      prisma.dentist.findMany({
        where: { labId, active: true },
        select: {
          id: true,
          name: true,
          clinicName: true,
          _count: { select: { cases: true } },
        },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }) as unknown as Promise<DentistSummary[]>,

      // Top dentists revenue (separate aggregation to avoid fetching all cases)
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId },
        _sum: { amount: true },
      }) as unknown as Promise<DentistRevenueStat[]>,

      // Tech names
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // Tech workload counts
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>,

      // Stats this month
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),

      // Monthly volumes
      Promise.all(monthlyVolumePromises),
    ]);

    // Post-processing
    const overdueWithDays = overdueCases.map((c) => {
      const diffTime = now.getTime() - new Date(c.dueDate!).getTime();
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...c, daysOverdue };
    });

    const dueSoonWithLabel = dueSoonCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const isToday =
        dueDate.getDate() === now.getDate() &&
        dueDate.getMonth() === now.getMonth() &&
        dueDate.getFullYear() === now.getFullYear();
      return { ...c, dueLabel: isToday ? "Today" : "Tomorrow" };
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
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    const dentistRevenueMap = new Map<string, number>();
    dentistRevenueRaw.forEach((rev) => {
      if (rev.dentistId) {
        dentistRevenueMap.set(rev.dentistId, rev._sum.amount || 0);
      }
    });

    const topDentistData = topDentistsRaw.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: dentistRevenueMap.get(d.id) || 0,
    }));

    // Correlate tech workload
    const techWorkloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    techWorkloadRaw.forEach((stat) => {
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
