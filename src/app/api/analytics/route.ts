import { NextRequest, NextResponse } from "next/server";
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
  _count: { id: number };
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

    // Prepare monthly promises for parallel execution (last 6 months)
    const monthlyPromises = Array.from({ length: 6 }).map((_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);

      return prisma.case.count({
        where: {
          labId,
          date: { gte: monthDate, lt: nextMonthDate },
        },
      });
    });

    // Execute all independent database queries in parallel to minimize round-trips.
    // This optimization reduces the total sequential execution time significantly.
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCasesData,
      monthlyCounts,
      topDentists,
      allTechnicians,
      techStatsRaw,
      casesThisMonth,
      revenueThisMonthResult
    ] = await Promise.all([
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
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      Promise.all(monthlyPromises),
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: {
          _count: { select: { cases: true } },
          cases: {
            select: { amount: true },
          },
        },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }),
      prisma.case.count({
        where: {
          labId,
          date: { gte: currentMonthStart },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      })
    ]);

    const techStats = techStatsRaw as unknown as TechStat[];

    // Process overdue cases with derived "daysOverdue"
    const overdueWithDays = overdueCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const diffTime = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...c,
        daysOverdue,
      };
    });

    // Process due soon cases with derived "dueLabel"
    const dueSoonWithLabel = dueSoonCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const isToday =
        dueDate.getDate() === now.getDate() &&
        dueDate.getMonth() === now.getMonth() &&
        dueDate.getFullYear() === now.getFullYear();
      return {
        ...c,
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

    // Calculate turnaround and on-time rate from consolidated deliveredCasesData in-memory
    let avgTurnaround = 0;
    let onTimeRate = 0;

    if (deliveredCasesData.length > 0) {
      const totalDays = deliveredCasesData.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCasesData.length) * 10) / 10;

      const deliveredWithDue = deliveredCasesData.filter(c => c.dueDate !== null);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    // Map monthly counts back to formatted volume data
    const monthlyCaseVolumes = monthlyCounts.map((count, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear(),
        count
      };
    });

    const topDentistData = topDentists.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
    }));

    // Derive tech workload from parallelized technicians and techStats (groupBy).
    // This replaces 2*N sequential count queries with a single aggregation.
    const techWorkload = allTechnicians.map((tech) => {
      const techStatsForUser = techStats.filter(s => s.technicianId === tech.id);
      const activeCases = techStatsForUser
        .filter(s => !["FINISHED", "DELIVERED"].includes(s.status))
        .reduce((sum, s) => sum + s._count.id, 0);
      const completedCases = techStatsForUser
        .filter(s => ["FINISHED", "DELIVERED"].includes(s.status))
        .reduce((sum, s) => sum + s._count.id, 0);

      return {
        id: tech.id,
        name: tech.name,
        activeCases,
        completedCases,
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
