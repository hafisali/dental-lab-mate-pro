import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

// Type definitions to satisfy ESLint @typescript-eslint/no-explicit-any
interface TechStat {
  technicianId: string | null;
  status: string;
  _count: { id: number };
}

interface CaseSummary {
  id: string;
  caseNumber: string;
  dentist: { id: string; name: string };
  patient: { id: string; name: string } | null;
  workType: string;
  dueDate: Date | null;
  status: string;
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

    // Optimized: Parallelize all database queries to avoid sequential bottlenecks
    // Reduces sequential await points from ~17 to 1
    const [
      activeCasesSummaries,
      deliveredCasesData,
      casesByStatus,
      casesByWorkType,
      topDentistsRaw,
      allTechnicians,
      techWorkloadRaw,
      revenueThisMonthData,
      ...monthlyVolumeResults
    ] = await Promise.all([
      // Combined Overdue and Due Soon cases into one query
      prisma.case.findMany({
        where: {
          labId,
          dueDate: { lt: tomorrowEnd, not: null },
          status: { notIn: ["FINISHED", "DELIVERED"] },
        },
        include: {
          dentist: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseSummary[]>,

      // Consolidated delivered case metrics
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),

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

      prisma.dentist.findMany({
        where: { labId, active: true },
        include: {
          _count: { select: { cases: true } },
          cases: { select: { amount: true } },
        },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),

      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // Optimized Technician Workload: Single groupBy query instead of N+1
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        _count: { id: true },
        where: { labId, technicianId: { not: null } },
      }) as unknown as Promise<TechStat[]>,

      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),

      // Last 6 months volumes parallelized
      ...Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(now);
        d.setDate(1); // Avoid 31st bug
        d.setMonth(d.getMonth() - (5 - i));
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        return prisma.case.count({
          where: { labId, date: { gte: monthStart, lt: monthEnd } },
        });
      }),
    ]);

    // Post-processing: Split combined case query into overdue and due soon
    const overdueCases = activeCasesSummaries
      .filter((c) => c.dueDate! < todayStart)
      .map((c) => {
        const diffTime = now.getTime() - new Date(c.dueDate!).getTime();
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...c, daysOverdue };
      });

    const dueSoonCases = activeCasesSummaries
      .filter((c) => c.dueDate! >= todayStart)
      .map((c) => {
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

    // Turnaround time & On-time rate
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredCasesData.length > 0) {
      const totalDays = deliveredCasesData.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCasesData.length) * 10) / 10;

      const deliveredWithDue = deliveredCasesData.filter((c) => c.dueDate);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    const monthlyCaseVolumes = (monthlyVolumeResults as number[]).map((count, i) => {
      const d = new Date(now);
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      return {
        month: d.toLocaleString("en-IN", { month: "short" }),
        year: d.getFullYear(),
        count,
      };
    });

    const topDentistData = topDentistsRaw.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
    }));

    // Map technician workload from O(1) lookup map
    const techStatsMap = new Map<string, { active: number; completed: number }>();
    techWorkloadRaw.forEach((stat) => {
      if (!stat.technicianId) return;
      const current = techStatsMap.get(stat.technicianId) || { active: 0, completed: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        current.completed += stat._count.id;
      } else {
        current.active += stat._count.id;
      }
      techStatsMap.set(stat.technicianId, current);
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
      overdueCases,
      dueSoonCases,
      statusCounts,
      workTypeCounts,
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes,
      topDentists: topDentistData,
      techWorkload,
      // Reuse current month count from time-series to save 1 query
      casesThisMonth: (monthlyVolumeResults[5] as number) || 0,
      revenueThisMonth: revenueThisMonthData._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
